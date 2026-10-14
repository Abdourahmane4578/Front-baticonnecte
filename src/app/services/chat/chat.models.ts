/**
 * Modèles du service Chat externe (Node/Express + Socket.IO + MongoDB).
 * Les noms de champs reprennent EXACTEMENT ceux renvoyés par le service
 * (snake_case, `_id` Mongo). Ne pas « embellir » côté front : on normalise
 * uniquement ce qui varie entre REST et socket (voir `conversationIdOf`).
 */

/** Enveloppe de réponse REST et des ACK Socket.IO. */
export interface ChatSuccess<T> {
  success: true;
  data: T;
}
export interface ChatFailure {
  success: false;
  message: string;
}
export type ChatResponse<T> = ChatSuccess<T> | ChatFailure;

export type ChatMessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  _id: string;
  /** ObjectId de la conversation (présent dans l'historique REST et `message:new`). */
  conversation?: string;
  /** Alias ajouté par le service dans la réponse de `send_message` / POST /api/messages. */
  conversation_id?: string;
  sender: string;
  recipient: string;
  content: string;
  message_type: 'text' | 'system';
  reply_to: string | null;
  status: ChatMessageStatus;
  delivered_to: string[];
  read_by: string[];
  edited: boolean;
  edited_at?: string | null;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  _id: string;
  participant_one: string;
  participant_two: string;
  participants_key: string;
  /** Peuplé (objet) par GET /api/conversations, sinon id ou null. */
  last_message_id: ChatMessage | string | null;
  last_message_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/** Élément de GET /api/conversations (conversation enrichie). */
export interface ChatConversationSummary extends ChatConversation {
  unread_count: number;
  other_participant: string;
}

export interface ChatMessagesPage {
  /** Du plus ancien au plus récent À L'INTÉRIEUR de la page. */
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChatUnreadCount {
  total_unread: number;
}

/* ---------- Payloads Socket.IO (client → serveur) ---------- */
export interface JoinConversationPayload {
  conversationId: string;
}
export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}
export interface SendMessagePayload {
  conversationId: string;
  content: string;
  replyTo?: string | null;
}
export interface MessageIdPayload {
  messageId: string;
}

/* ---------- Événements Socket.IO (serveur → client) ---------- */
export interface PresenceConnectedEvent {
  user_id: string;
  online: boolean;
  connected_socket_ids: string[];
}
export interface PresenceUpdateEvent {
  user_id: string;
  online: boolean;
  last_seen: string;
}
export interface ConversationJoinedEvent {
  conversationId: string;
}
export interface MessageStatusEvent {
  messageId: string;
  status: ChatMessageStatus;
  user_id: string;
}
export interface TypingEvent {
  conversationId: string;
  user_id: string;
  isTyping: boolean;
}

export type ChatConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Retourne l'id de conversation d'un message, quelle que soit la source (REST ou socket). */
export function conversationIdOf(message: Pick<ChatMessage, 'conversation' | 'conversation_id'>): string {
  const raw = message.conversation_id ?? message.conversation ?? '';
  return typeof raw === 'string' ? raw : String(raw);
}

/** Dernier message d'un résumé de conversation, si peuplé. */
export function lastMessageOf(conv: ChatConversation): ChatMessage | null {
  const lm = conv.last_message_id;
  return lm && typeof lm === 'object' ? lm : null;
}
