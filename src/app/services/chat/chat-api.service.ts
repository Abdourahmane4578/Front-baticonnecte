import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  ChatMessagesPage,
  ChatResponse,
  ChatUnreadCount,
} from './chat.models';

/**
 * Client REST du service Chat externe.
 * Seuls les endpoints DOCUMENTÉS (docs/openapi.json du service) sont exposés ici :
 *   POST /api/conversations/find-or-create
 *   GET  /api/conversations
 *   GET  /api/conversations/{id}/messages?page&limit
 *   POST /api/messages
 *   GET  /api/messages/unread-count
 *
 * L'identité est fournie par `chatIdentityInterceptor` (dev) ou par la Gateway (prod).
 * `authInterceptor` ajoute déjà `Authorization: Bearer <jwt>` à toutes les requêtes.
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.chat.apiUrl.replace(/\/+$/, '');

  findOrCreateConversation(participantId: string): Observable<ChatConversation> {
    return this.http
      .post<ChatResponse<ChatConversation>>(`${this.baseUrl}/api/conversations/find-or-create`, {
        participant_id: participantId,
      })
      .pipe(map(unwrap), catchError(toChatError));
  }

  listConversations(): Observable<ChatConversationSummary[]> {
    return this.http
      .get<ChatResponse<ChatConversationSummary[]>>(`${this.baseUrl}/api/conversations`)
      .pipe(map(unwrap), catchError(toChatError));
  }

  getMessages(conversationId: string, page = 1, limit = environment.chat.pageSize): Observable<ChatMessagesPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ChatResponse<ChatMessagesPage>>(`${this.baseUrl}/api/conversations/${conversationId}/messages`, { params })
      .pipe(map(unwrap), catchError(toChatError));
  }

  /** Repli REST utilisé quand le socket n'est pas connecté. */
  sendMessage(conversationId: string, content: string, replyTo: string | null = null): Observable<ChatMessage> {
    return this.http
      .post<ChatResponse<ChatMessage>>(`${this.baseUrl}/api/messages`, {
        conversation_id: conversationId,
        content,
        reply_to: replyTo,
      })
      .pipe(map(unwrap), catchError(toChatError));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<ChatResponse<ChatUnreadCount>>(`${this.baseUrl}/api/messages/unread-count`)
      .pipe(
        map(unwrap),
        map((d) => d.total_unread),
        catchError(toChatError),
      );
  }
}

/** Erreur normalisée côté front. */
export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ChatApiError';
  }
}

function unwrap<T>(res: ChatResponse<T>): T {
  if (res && res.success) return res.data;
  throw new ChatApiError((res as { message?: string })?.message ?? 'Réponse invalide du service Chat', 200);
}

function toChatError(err: unknown) {
  if (err instanceof ChatApiError) return throwError(() => err);
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string } | null;
    const msg =
      err.status === 0
        ? 'Service de messagerie injoignable.'
        : (body?.message ?? err.message ?? 'Erreur du service Chat');
    return throwError(() => new ChatApiError(msg, err.status));
  }
  return throwError(() => new ChatApiError('Erreur inattendue du service Chat', 0));
}
