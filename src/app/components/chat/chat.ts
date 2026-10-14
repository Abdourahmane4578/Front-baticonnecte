import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ArtisanService } from '../../services/artisan.service';
import { ChatStore } from '../../services/chat/chat-store.service';
import { ChatConversationSummary, ChatMessage, lastMessageOf } from '../../services/chat/chat.models';

const TYPING_IDLE_MS = 2000;

/**
 * Composant Chat — messagerie temps réel adossée au service Chat externe.
 *
 * Toute la logique d'état vit dans `ChatStore` (REST + Socket.IO). Ce composant
 * ne fait que présenter : liste des conversations, contacts pour démarrer une
 * discussion, historique paginé, saisie (avec indicateur « en train d'écrire »),
 * réponse à un message.
 *
 * Entrée : `/messages?with=<userId>` ouvre (ou crée) la conversation avec cet utilisateur.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
  readonly store = inject(ChatStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly artisanService = inject(ArtisanService);

  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  /* ------------------------------ UI state ------------------------------ */
  newMessage = '';
  replyingTo: ChatMessage | null = null;
  sending = signal(false);
  search = signal('');
  showContacts = signal(false);

  private typingSent = false;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastScrolledMessageId: string | null = null;
  private preserveScrollFrom: number | null = null;

  private readonly artisans = toSignal(this.artisanService.artisans$, { initialValue: [] as any[] });

  /** Conversations filtrées par la recherche (nom de l'interlocuteur ou dernier message). */
  readonly filteredConversations = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.store.conversations();
    if (!q) return list;
    return list.filter((c) => {
      const name = this.store.peer(c.other_participant).name.toLowerCase();
      const last = lastMessageOf(c)?.content?.toLowerCase() ?? '';
      return name.includes(q) || last.includes(q);
    });
  });

  /** Contacts (artisans) disponibles pour démarrer une nouvelle discussion. */
  readonly contacts = computed(() => {
    const me = this.store.me();
    const q = this.search().trim().toLowerCase();
    return this.artisans()
      .filter((a) => a?.id != null && String(a.id) !== me)
      .filter((a) => !q || String(a.name).toLowerCase().includes(q) || String(a.job ?? '').toLowerCase().includes(q));
  });

  readonly activePeer = computed(() => {
    const conv = this.store.activeConversation();
    return conv ? this.store.peer(conv.other_participant) : null;
  });

  constructor() {
    // Défilement : en bas à l'arrivée d'un nouveau message / changement de conversation,
    // conservation de la position quand on charge des messages plus anciens.
    effect(() => {
      const msgs = this.store.messages();
      const el = this.scroller()?.nativeElement;
      if (!el) return;
      const last = msgs[msgs.length - 1]?._id ?? null;
      if (this.preserveScrollFrom !== null) {
        const from = this.preserveScrollFrom;
        this.preserveScrollFrom = null;
        queueMicrotask(() => (el.scrollTop = el.scrollHeight - from));
        return;
      }
      if (last !== this.lastScrolledMessageId) {
        this.lastScrolledMessageId = last;
        queueMicrotask(() => (el.scrollTop = el.scrollHeight));
      }
    });
  }

  ngOnInit(): void {
    this.store.init();
    const withId = this.route.snapshot.queryParamMap.get('with');
    if (withId) {
      void this.store.openWith(withId).then(() => {
        // Nettoie l'URL pour éviter de recréer la conversation au rafraîchissement.
        void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      });
    }
  }

  ngOnDestroy(): void {
    this.stopTyping();
    // On garde le socket ouvert (présence) ; seule la conversation active est fermée.
    this.store.close();
  }

  /* ------------------------------ actions ------------------------------ */

  select(conv: ChatConversationSummary): void {
    this.cancelReply();
    this.showContacts.set(false);
    void this.store.open(conv._id);
  }

  startWith(userId: string): void {
    this.cancelReply();
    this.showContacts.set(false);
    this.search.set('');
    void this.store.openWith(String(userId));
  }

  back(): void {
    this.stopTyping();
    this.store.close();
  }

  async send(): Promise<void> {
    const text = this.newMessage.trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    this.stopTyping();
    const ok = await this.store.send(text, this.replyingTo?._id ?? null);
    this.sending.set(false);
    if (ok) {
      this.newMessage = '';
      this.replyingTo = null;
    }
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return; // Shift+Entrée = retour à la ligne
    e.preventDefault();
    void this.send();
  }

  onTyping(): void {
    if (!this.store.activeConversationId()) return;
    if (!this.typingSent) {
      this.typingSent = true;
      this.store.notifyTyping(true);
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(), TYPING_IDLE_MS);
  }

  loadOlder(): void {
    const el = this.scroller()?.nativeElement;
    this.preserveScrollFrom = el ? el.scrollHeight - el.scrollTop : null;
    void this.store.loadOlder();
  }

  reply(msg: ChatMessage): void {
    this.replyingTo = msg;
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  retry(): void {
    void this.store.loadConversations();
    const id = this.store.activeConversationId();
    if (id) void this.store.loadMessages(id, 1);
  }

  /* ------------------------------ helpers ------------------------------ */

  isMine(msg: ChatMessage): boolean {
    return msg.sender === this.store.me();
  }

  quoted(msg: ChatMessage): ChatMessage | null {
    if (!msg.reply_to) return null;
    return this.store.messages().find((m) => m._id === msg.reply_to) ?? null;
  }

  /** Affiche un séparateur de date quand le jour change entre deux messages. */
  isNewDay(index: number): boolean {
    const msgs = this.store.messages();
    if (index === 0) return true;
    return dayKey(msgs[index - 1].created_at) !== dayKey(msgs[index].created_at);
  }

  dayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(iso) === dayKey(today.toISOString())) return "Aujourd'hui";
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  previewOf(conv: ChatConversationSummary): string {
    const lm = lastMessageOf(conv);
    if (!lm) return 'Nouvelle conversation';
    return (lm.sender === this.store.me() ? 'Vous : ' : '') + lm.content;
  }

  avatarUrl(seed: string): string {
    return 'https://api.dicebear.com/8.x/avataaars/svg?seed=' + encodeURIComponent(seed || 'U');
  }

  trackById(_: number, item: { _id: string }): string {
    return item._id;
  }

  private stopTyping(): void {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = null;
    if (this.typingSent) {
      this.typingSent = false;
      this.store.notifyTyping(false);
    }
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
