import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth';
import { ArtisanService } from '../artisan.service';
import { UserService } from '../user.service';
import { ChatApiService } from './chat-api.service';
import { ChatSocketService } from './chat-socket.service';
import {
  ChatConversationSummary,
  ChatMessage,
  ChatMessageStatus,
  MessageStatusEvent,
  conversationIdOf,
  lastMessageOf,
} from './chat.models';

/** Informations d'affichage d'un interlocuteur (résolues depuis l'API BatiConnecte). */
export interface ChatPeer {
  id: string;
  name: string;
  avatar: string;
  job?: string;
}

interface ConversationPaging {
  page: number;
  totalPages: number;
  loading: boolean;
}

const STATUS_RANK: Record<ChatMessageStatus, number> = { sent: 0, delivered: 1, read: 2 };
const TYPING_TTL_MS = 3000;
const LIST_REFRESH_MS = 30_000;

/**
 * État de la messagerie côté front. Orchestration REST (historique, liste) +
 * Socket.IO (temps réel). Aucune logique métier du service Chat n'est
 * réimplémentée ici : on se contente de refléter ce qu'il renvoie.
 *
 * Dédoublonnage : chaque conversation stocke ses messages dans une `Map<_id>`.
 * Un message reçu par l'ACK de `send_message` ET par `message:new` (le serveur
 * émet dans la room, émetteur compris) n'apparaît donc qu'une fois.
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ChatApiService);
  private readonly socket = inject(ChatSocketService);
  private readonly auth = inject(AuthService);
  private readonly artisans = inject(ArtisanService);
  private readonly users = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private initialized = false;
  private readonly pendingPeerLookups = new Set<string>();
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /* ----------------------------- état ----------------------------- */
  readonly me = signal<string | null>(null);
  readonly conversations = signal<ChatConversationSummary[]>([]);
  readonly activeConversationId = signal<string | null>(null);
  readonly loadingConversations = signal(false);
  readonly loadingMessages = signal(false);
  readonly error = signal<string | null>(null);

  private readonly messagesByConv = signal<Map<string, Map<string, ChatMessage>>>(new Map());
  private readonly paging = signal<Map<string, ConversationPaging>>(new Map());
  private readonly typingByConv = signal<Map<string, boolean>>(new Map());
  readonly presence = signal<Map<string, { online: boolean; last_seen?: string }>>(new Map());
  readonly peers = signal<Map<string, ChatPeer>>(new Map());

  readonly connectionState = this.socket.state;
  readonly socketError = this.socket.lastError;

  readonly activeConversation = computed(
    () => this.conversations().find((c) => c._id === this.activeConversationId()) ?? null,
  );

  /** Messages de la conversation active, triés chronologiquement. */
  readonly messages = computed<ChatMessage[]>(() => {
    const id = this.activeConversationId();
    if (!id) return [];
    const bucket = this.messagesByConv().get(id);
    if (!bucket) return [];
    return [...bucket.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  });

  readonly hasOlderMessages = computed(() => {
    const id = this.activeConversationId();
    const p = id ? this.paging().get(id) : undefined;
    return !!p && p.page < p.totalPages;
  });

  readonly loadingOlder = computed(() => {
    const id = this.activeConversationId();
    return !!(id && this.paging().get(id)?.loading);
  });

  readonly peerIsTyping = computed(() => {
    const id = this.activeConversationId();
    return !!(id && this.typingByConv().get(id));
  });

  readonly totalUnread = computed(() => this.conversations().reduce((n, c) => n + (c.unread_count || 0), 0));

  /* --------------------------- cycle de vie --------------------------- */

  /** À appeler depuis le composant Chat. Idempotent. */
  init(): void {
    if (!this.isBrowser || this.initialized) return;
    const user = this.auth.getUser();
    if (!user?.id) {
      this.error.set('Vous devez être connecté pour accéder à la messagerie.');
      return;
    }
    this.initialized = true;
    this.me.set(String(user.id));
    this.rememberPeer({
      id: String(user.id),
      name: user.username || user.nomComplet || user.email || 'Moi',
      avatar: (user.username || 'Moi').split(' ')[0],
    });

    this.bindSocket();
    this.socket.connect();
    this.watchDirectories();
    void this.loadConversations();

    // Le service n'émet pas d'événement « nouvelle conversation » : on rafraîchit
    // périodiquement la liste (endpoint documenté) pour voir celles créées par autrui.
    const poll = setInterval(() => {
      if (this.initialized && this.pageVisible()) void this.loadConversations();
    }, LIST_REFRESH_MS);
    this.destroyRef.onDestroy(() => clearInterval(poll));

    // Déconnexion BatiConnecte → on coupe le socket et on vide l'état.
    this.auth.isLoggedIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((logged) => {
      if (!logged && this.initialized) this.reset();
    });
  }

  /** À appeler lors du logout : coupe le socket et vide l'état. */
  reset(): void {
    this.socket.disconnect();
    this.initialized = false;
    this.me.set(null);
    this.conversations.set([]);
    this.activeConversationId.set(null);
    this.messagesByConv.set(new Map());
    this.paging.set(new Map());
    this.typingByConv.set(new Map());
    this.error.set(null);
  }

  /* ---------------------------- conversations ---------------------------- */

  async loadConversations(): Promise<void> {
    this.loadingConversations.set(true);
    try {
      const list = await firstValueFrom(this.api.listConversations());
      this.conversations.set(list);
      // Rejoindre toutes les rooms : le service n'émet `message:new` que dans la room.
      for (const c of list) {
        this.socket.joinConversation(c._id);
        this.ensurePeer(c.other_participant);
        const lm = lastMessageOf(c);
        if (lm) this.upsertMessage(lm, c._id);
      }
      this.error.set(null);
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.loadingConversations.set(false);
    }
  }

  /** Point d'entrée « Envoyer un message » : trouve/crée la conversation puis l'ouvre. */
  async openWith(participantId: string): Promise<string | null> {
    const me = this.me();
    if (!me) return null;
    if (participantId === me) {
      this.error.set('Vous ne pouvez pas vous envoyer un message à vous-même.');
      return null;
    }
    try {
      const conv = await firstValueFrom(this.api.findOrCreateConversation(participantId));
      const existing = this.conversations().find((c) => c._id === conv._id);
      if (!existing) {
        const summary: ChatConversationSummary = { ...conv, unread_count: 0, other_participant: participantId };
        this.conversations.update((list) => [summary, ...list]);
      }
      this.ensurePeer(participantId);
      await this.open(conv._id);
      return conv._id;
    } catch (e) {
      this.error.set(messageOf(e));
      return null;
    }
  }

  async open(conversationId: string): Promise<void> {
    if (this.activeConversationId() === conversationId) return;
    this.activeConversationId.set(conversationId);
    this.socket.joinConversation(conversationId);
    if (!this.messagesByConv().get(conversationId)?.size || !this.paging().get(conversationId)) {
      await this.loadMessages(conversationId, 1);
    }
    this.markVisibleAsRead(conversationId);
  }

  close(): void {
    const id = this.activeConversationId();
    if (id) this.socket.typing(id, false);
    this.activeConversationId.set(null);
  }

  /* ------------------------------ messages ------------------------------ */

  async loadMessages(conversationId: string, page: number): Promise<void> {
    const isFirst = page === 1;
    if (isFirst) this.loadingMessages.set(true);
    this.updatePaging(conversationId, (p) => ({ ...p, loading: true }));
    try {
      const res = await firstValueFrom(this.api.getMessages(conversationId, page));
      for (const m of res.messages) this.upsertMessage(m, conversationId);
      this.updatePaging(conversationId, () => ({ page: res.page, totalPages: res.totalPages, loading: false }));
      this.error.set(null);
    } catch (e) {
      this.updatePaging(conversationId, (p) => ({ ...p, loading: false }));
      this.error.set(messageOf(e));
    } finally {
      if (isFirst) this.loadingMessages.set(false);
    }
  }

  async loadOlder(): Promise<void> {
    const id = this.activeConversationId();
    if (!id) return;
    const p = this.paging().get(id);
    if (!p || p.loading || p.page >= p.totalPages) return;
    await this.loadMessages(id, p.page + 1);
  }

  /** Envoi via Socket.IO (ACK) ; repli REST si le temps réel est coupé. */
  async send(content: string, replyTo: string | null = null): Promise<boolean> {
    const id = this.activeConversationId();
    const text = content.trim();
    if (!id || !text) return false;
    try {
      const msg = this.socket.isConnected
        ? await this.socket.sendMessage({ conversationId: id, content: text, replyTo })
        : await firstValueFrom(this.api.sendMessage(id, text, replyTo));
      this.upsertMessage(msg, id);
      this.bumpConversation(msg, id, false);
      this.socket.typing(id, false);
      this.error.set(null);
      return true;
    } catch (e) {
      this.error.set(messageOf(e));
      return false;
    }
  }

  notifyTyping(isTyping: boolean): void {
    const id = this.activeConversationId();
    if (id) this.socket.typing(id, isTyping);
  }

  /* ------------------------------- peers ------------------------------- */

  peer(userId: string | null | undefined): ChatPeer {
    if (!userId) return { id: '', name: 'Utilisateur', avatar: 'U' };
    return this.peers().get(userId) ?? { id: userId, name: `Utilisateur ${userId.slice(0, 6)}`, avatar: userId.slice(0, 2) };
  }

  isOnline(userId: string | null | undefined): boolean {
    return !!(userId && this.presence().get(userId)?.online);
  }

  rememberPeer(peer: ChatPeer): void {
    this.peers.update((m) => {
      const next = new Map(m);
      next.set(peer.id, peer);
      return next;
    });
  }

  /* ----------------------------- internes ----------------------------- */

  private bindSocket(): void {
    const me = this.me();

    this.socket.onMessageNew.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
      const convId = conversationIdOf(msg);
      const isNew = !this.messagesByConv().get(convId)?.has(msg._id);
      this.upsertMessage(msg, convId);
      const incoming = msg.sender !== me;
      if (incoming && isNew) {
        this.bumpConversation(msg, convId, convId !== this.activeConversationId());
        this.setTyping(convId, false);
        void this.socket.markDelivered(msg._id).catch(() => undefined);
        if (convId === this.activeConversationId() && this.pageVisible()) {
          void this.socket.markRead(msg._id).catch(() => undefined);
        }
      } else if (!incoming) {
        this.bumpConversation(msg, convId, false);
      }
    });

    this.socket.onMessageStatus.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => this.applyStatus(e));

    this.socket.onTyping.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.user_id === me) return;
      this.setTyping(e.conversationId, e.isTyping);
    });

    this.socket.onPresenceUpdate.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      this.presence.update((m) => {
        const next = new Map(m);
        next.set(e.user_id, { online: e.online, last_seen: e.last_seen });
        return next;
      });
    });

    this.socket.onPresenceConnected.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.user_id) {
        this.presence.update((m) => new Map(m).set(e.user_id, { online: e.online }));
      }
    });
  }

  /** Alimente l'annuaire des interlocuteurs depuis les listes déjà chargées par BatiConnecte. */
  private watchDirectories(): void {
    this.artisans.artisans$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      if (!list?.length) return;
      this.peers.update((m) => {
        const next = new Map(m);
        for (const a of list) {
          if (a?.id != null) next.set(String(a.id), { id: String(a.id), name: a.name, avatar: a.avatar, job: a.job });
        }
        return next;
      });
    });
    this.users.users$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      if (!list?.length) return;
      this.peers.update((m) => {
        const next = new Map(m);
        for (const u of list as any[]) {
          const id = u?.id != null ? String(u.id) : null;
          if (id && !next.has(id)) {
            const name = u.nomComplet || u.username || u.email || `Utilisateur ${id.slice(0, 6)}`;
            next.set(id, { id, name, avatar: name.split(' ')[0] });
          }
        }
        return next;
      });
    });
  }

  /** Résout un interlocuteur inconnu via GET /users/{id} (une seule fois par id). */
  private ensurePeer(userId: string): void {
    if (!userId || this.peers().has(userId) || this.pendingPeerLookups.has(userId)) return;
    this.pendingPeerLookups.add(userId);
    this.users
      .getById(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u: any) => {
        this.pendingPeerLookups.delete(userId);
        if (!u) return;
        const name = u.nomComplet || u.username || u.name || u.email || `Utilisateur ${userId.slice(0, 6)}`;
        this.rememberPeer({ id: userId, name, avatar: name.split(' ')[0], job: u.metier || u.role });
      });
  }

  private upsertMessage(msg: ChatMessage, conversationId: string): void {
    if (!msg?._id || !conversationId) return;
    this.messagesByConv.update((all) => {
      const next = new Map(all);
      const bucket = new Map(next.get(conversationId) ?? []);
      const prev = bucket.get(msg._id);
      // Ne jamais rétrograder un statut déjà avancé (ex. ACK 'sent' arrivant après 'read').
      const status = prev && STATUS_RANK[prev.status] > STATUS_RANK[msg.status] ? prev.status : msg.status;
      bucket.set(msg._id, { ...prev, ...msg, status });
      next.set(conversationId, bucket);
      return next;
    });
  }

  private applyStatus(e: MessageStatusEvent): void {
    if (e.user_id === this.me()) return; // nos propres accusés ne changent pas l'affichage
    this.messagesByConv.update((all) => {
      for (const [convId, bucket] of all) {
        const m = bucket.get(e.messageId);
        if (!m) continue;
        if (STATUS_RANK[e.status] <= STATUS_RANK[m.status]) return all;
        const next = new Map(all);
        const nb = new Map(bucket);
        nb.set(e.messageId, { ...m, status: e.status });
        next.set(convId, nb);
        return next;
      }
      return all;
    });
  }

  /** Met à jour l'aperçu de la liste et place la conversation en tête. */
  private bumpConversation(msg: ChatMessage, conversationId: string, incrementUnread: boolean): void {
    if (!this.conversations().some((c) => c._id === conversationId)) {
      // Conversation inconnue localement (créée par l'autre participant) : on recharge la liste.
      void this.loadConversations();
      return;
    }
    this.conversations.update((list) => {
      const idx = list.findIndex((c) => c._id === conversationId);
      if (idx === -1) return list;
      const c = list[idx];
      const updated: ChatConversationSummary = {
        ...c,
        last_message_id: msg,
        last_message_at: msg.created_at,
        unread_count: incrementUnread ? (c.unread_count || 0) + 1 : c.unread_count,
      };
      return [updated, ...list.slice(0, idx), ...list.slice(idx + 1)];
    });
  }

  /** Marque comme lus les messages reçus non lus de la page chargée, et remet le compteur à 0. */
  private markVisibleAsRead(conversationId: string): void {
    const me = this.me();
    const bucket = this.messagesByConv().get(conversationId);
    if (!me || !bucket) return;
    for (const m of bucket.values()) {
      if (m.sender !== me && !m.read_by?.includes(me) && m.status !== 'read') {
        void this.socket.markRead(m._id).catch(() => undefined);
      }
    }
    this.conversations.update((list) =>
      list.map((c) => (c._id === conversationId && c.unread_count ? { ...c, unread_count: 0 } : c)),
    );
  }

  private setTyping(conversationId: string, isTyping: boolean): void {
    const timer = this.typingTimers.get(conversationId);
    if (timer) clearTimeout(timer);
    this.typingByConv.update((m) => new Map(m).set(conversationId, isTyping));
    if (isTyping) {
      this.typingTimers.set(
        conversationId,
        setTimeout(() => this.typingByConv.update((m) => new Map(m).set(conversationId, false)), TYPING_TTL_MS),
      );
    }
  }

  private updatePaging(conversationId: string, fn: (p: ConversationPaging) => ConversationPaging): void {
    this.paging.update((m) => {
      const next = new Map(m);
      next.set(conversationId, fn(next.get(conversationId) ?? { page: 0, totalPages: 1, loading: false }));
      return next;
    });
  }

  private pageVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState === 'visible';
  }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Erreur du service de messagerie';
}
