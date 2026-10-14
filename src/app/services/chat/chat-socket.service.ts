import { Injectable, InjectionToken, NgZone, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth';
import {
  ChatConnectionState,
  ChatMessage,
  ChatResponse,
  ConversationJoinedEvent,
  MessageIdPayload,
  MessageStatusEvent,
  PresenceConnectedEvent,
  PresenceUpdateEvent,
  SendMessagePayload,
  TypingEvent,
} from './chat.models';

/**
 * Connexion Socket.IO UNIQUE vers le service Chat (singleton `providedIn: 'root'`).
 *
 * - Paresseuse : créée au premier `connect()`, jamais côté SSR.
 * - Reconnexion automatique (options recommandées par la doc du service) ; les rooms
 *   rejointes sont mémorisées et rejointes à chaque `connect` (sinon on ne recevrait
 *   plus `message:new` après une coupure réseau).
 * - Les émissions avec ACK sont exposées en Promise et rejettent si `success:false`.
 *
 * Identité : `auth.user_id` n'est envoyé qu'en dev (`devIdentityHeader`). Le service
 * Chat ne vérifie pas le jeton ; en production la Gateway doit valider `auth.token`
 * et fournir l'identité au service (voir rapport sécurité).
 */
export type SocketFactory = (url: string, opts: Partial<ManagerOptions & SocketOptions>) => Socket;

/** Fabrique de socket injectable (remplacée par un faux socket dans les tests). */
export const CHAT_SOCKET_FACTORY = new InjectionToken<SocketFactory>('CHAT_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => (url, opts) => io(url, opts),
});

@Injectable({ providedIn: 'root' })
export class ChatSocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly createSocket = inject(CHAT_SOCKET_FACTORY);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private socket: Socket | null = null;
  private readonly joinedRooms = new Set<string>();

  readonly state = signal<ChatConnectionState>('disconnected');
  readonly lastError = signal<string | null>(null);

  private readonly messageNew$ = new Subject<ChatMessage>();
  private readonly messageStatus$ = new Subject<MessageStatusEvent>();
  private readonly typing$ = new Subject<TypingEvent>();
  private readonly presenceConnected$ = new Subject<PresenceConnectedEvent>();
  private readonly presenceUpdate$ = new Subject<PresenceUpdateEvent>();
  private readonly conversationJoined$ = new Subject<ConversationJoinedEvent>();

  /** Flux typés (serveur → client). */
  get onMessageNew(): Observable<ChatMessage> { return this.messageNew$.asObservable(); }
  get onMessageStatus(): Observable<MessageStatusEvent> { return this.messageStatus$.asObservable(); }
  get onTyping(): Observable<TypingEvent> { return this.typing$.asObservable(); }
  get onPresenceConnected(): Observable<PresenceConnectedEvent> { return this.presenceConnected$.asObservable(); }
  get onPresenceUpdate(): Observable<PresenceUpdateEvent> { return this.presenceUpdate$.asObservable(); }
  get onConversationJoined(): Observable<ConversationJoinedEvent> { return this.conversationJoined$.asObservable(); }

  get isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /** Ouvre (ou réutilise) la connexion. Idempotent. */
  connect(): void {
    if (!this.isBrowser) return;
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    const user = this.auth.getUser();
    const token = this.auth.getToken();
    const authPayload: Record<string, string> = {};
    if (token) authPayload['token'] = token;
    if (environment.chat.devIdentityHeader && user?.id) authPayload['user_id'] = String(user.id);

    this.state.set('connecting');

    // Hors zone Angular : le flux socket peut être dense ; on réentre dans la zone
    // uniquement pour notifier (voir `emitInZone`).
    this.socket = this.zone.runOutsideAngular(() =>
      this.createSocket(environment.chat.socketUrl, {
        auth: authPayload,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      }),
    );

    this.bind(this.socket);
  }

  /** Ferme la connexion et oublie les rooms (déconnexion utilisateur). */
  disconnect(): void {
    this.joinedRooms.clear();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.state.set('disconnected');
  }

  joinConversation(conversationId: string): void {
    if (!conversationId) return;
    this.joinedRooms.add(conversationId);
    if (this.socket?.connected) this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    if (!conversationId) return;
    this.joinedRooms.delete(conversationId);
    if (this.socket?.connected) this.socket.emit('leave_conversation', { conversationId });
  }

  typing(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected || !conversationId) return;
    this.socket.emit('typing', { conversationId, isTyping });
  }

  sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    return this.emitWithAck<ChatMessage>('send_message', payload);
  }

  markDelivered(messageId: string): Promise<ChatMessage> {
    return this.emitWithAck<ChatMessage>('message_delivered', { messageId } satisfies MessageIdPayload);
  }

  markRead(messageId: string): Promise<ChatMessage> {
    return this.emitWithAck<ChatMessage>('message_read', { messageId } satisfies MessageIdPayload);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /* ------------------------------------------------------------------ */

  private bind(socket: Socket): void {
    socket.on('connect', () => {
      this.emitInZone(() => {
        this.state.set('connected');
        this.lastError.set(null);
      });
      // Rejoindre les rooms après (re)connexion : Socket.IO ne les restaure pas.
      for (const room of this.joinedRooms) socket.emit('join_conversation', { conversationId: room });
    });

    socket.on('disconnect', (reason) => {
      this.emitInZone(() => {
        // `io server disconnect` / `io client disconnect` ne déclenchent pas d'auto-reconnexion.
        const manual = reason === 'io client disconnect' || reason === 'io server disconnect';
        this.state.set(manual ? 'disconnected' : 'reconnecting');
      });
    });

    socket.io.on('reconnect_attempt', () => this.emitInZone(() => this.state.set('reconnecting')));
    socket.on('connect_error', (err: Error) =>
      this.emitInZone(() => {
        this.state.set('reconnecting');
        this.lastError.set(err?.message || 'Connexion temps réel impossible');
      }),
    );

    socket.on('message:new', (m: ChatMessage) => this.emitInZone(() => this.messageNew$.next(m)));
    socket.on('message:status', (e: MessageStatusEvent) => this.emitInZone(() => this.messageStatus$.next(e)));
    socket.on('typing', (e: TypingEvent) => this.emitInZone(() => this.typing$.next(e)));
    socket.on('presence:connected', (e: PresenceConnectedEvent) => this.emitInZone(() => this.presenceConnected$.next(e)));
    socket.on('presence:update', (e: PresenceUpdateEvent) => this.emitInZone(() => this.presenceUpdate$.next(e)));
    socket.on('conversation:joined', (e: ConversationJoinedEvent) => this.emitInZone(() => this.conversationJoined$.next(e)));
  }

  private emitWithAck<T>(event: string, payload: unknown): Promise<T> {
    const socket = this.socket;
    if (!socket?.connected) {
      return Promise.reject(new Error('Temps réel déconnecté'));
    }
    return new Promise<T>((resolve, reject) => {
      socket.timeout(8000).emit(event, payload, (err: Error | null, res?: ChatResponse<T>) => {
        this.emitInZone(() => {
          if (err) return reject(new Error('Pas de réponse du service Chat'));
          if (res && res.success) return resolve(res.data);
          reject(new Error((res as { message?: string } | undefined)?.message ?? 'Erreur du service Chat'));
        });
      });
    });
  }

  private emitInZone(fn: () => void): void {
    if (NgZone.isInAngularZone()) fn();
    else this.zone.run(fn);
  }
}
