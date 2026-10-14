import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ChatStore } from './chat-store.service';
import { ChatApiService } from './chat-api.service';
import { ChatSocketService } from './chat-socket.service';
import { AuthService } from '../auth';
import { ArtisanService } from '../artisan.service';
import { UserService } from '../user.service';
import { ChatMessage } from './chat.models';

const ME = 'uuid-moi';
const OTHER = 'uuid-pro';

function msg(partial: Partial<ChatMessage>): ChatMessage {
  return {
    _id: 'm',
    conversation: 'c1',
    sender: OTHER,
    recipient: ME,
    content: 'hello',
    message_type: 'text',
    reply_to: null,
    status: 'sent',
    delivered_to: [],
    read_by: [],
    edited: false,
    is_deleted: false,
    created_at: '2026-10-09T10:00:00.000Z',
    updated_at: '2026-10-09T10:00:00.000Z',
    ...partial,
  };
}

class FakeSocket {
  state = signal<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('connected');
  lastError = signal<string | null>(null);
  isConnected = true;
  joined: string[] = [];
  delivered: string[] = [];
  read: string[] = [];
  typingCalls: any[] = [];
  messageNew$ = new Subject<ChatMessage>();
  messageStatus$ = new Subject<any>();
  typing$ = new Subject<any>();
  presenceUpdate$ = new Subject<any>();
  presenceConnected$ = new Subject<any>();
  get onMessageNew() { return this.messageNew$.asObservable(); }
  get onMessageStatus() { return this.messageStatus$.asObservable(); }
  get onTyping() { return this.typing$.asObservable(); }
  get onPresenceUpdate() { return this.presenceUpdate$.asObservable(); }
  get onPresenceConnected() { return this.presenceConnected$.asObservable(); }
  connect() {}
  disconnect() {}
  joinConversation(id: string) { this.joined.push(id); }
  leaveConversation() {}
  typing(id: string, isTyping: boolean) { this.typingCalls.push({ id, isTyping }); }
  sendMessage = async (p: any) =>
    msg({ _id: 'm-ack', sender: ME, recipient: OTHER, content: p.content, conversation_id: p.conversationId, conversation: undefined });
  markDelivered = async (id: string) => { this.delivered.push(id); return msg({ _id: id }); };
  markRead = async (id: string) => { this.read.push(id); return msg({ _id: id }); };
}

class FakeApi {
  findOrCreateCalls: string[] = [];
  listConversations = () => of([{ _id: 'c1', participant_one: ME, participant_two: OTHER, other_participant: OTHER, unread_count: 1, last_message_id: null, last_message_at: null } as any]);
  findOrCreateConversation = (id: string) => {
    this.findOrCreateCalls.push(id);
    return of({ _id: 'c1', participant_one: ME, participant_two: OTHER } as any);
  };
  getMessages = () => of({ messages: [msg({ _id: 'h1', created_at: '2026-10-09T09:00:00.000Z' })], total: 1, page: 1, limit: 20, totalPages: 1 });
  sendMessage = () => of(msg({ _id: 'm-rest', sender: ME }));
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ChatStore', () => {
  let store: ChatStore;
  let socket: FakeSocket;
  let api: FakeApi;

  beforeEach(() => {
    socket = new FakeSocket();
    api = new FakeApi();
    TestBed.configureTestingModule({
      providers: [
        { provide: ChatSocketService, useValue: socket },
        { provide: ChatApiService, useValue: api },
        { provide: AuthService, useValue: { getUser: () => ({ id: ME, username: 'Moi' }), isLoggedIn$: new BehaviorSubject(true) } },
        { provide: ArtisanService, useValue: { artisans$: of([{ id: OTHER, name: 'Mamadou Pro', avatar: 'Mamadou', job: 'Maçon' }]) } },
        { provide: UserService, useValue: { users$: of([]), getById: () => of(null) } },
      ],
    });
    store = TestBed.inject(ChatStore);
    store.init();
  });

  it('charge la liste, rejoint les rooms et résout les noms depuis les artisans', async () => {
    await flush();
    expect(store.conversations().length).toBe(1);
    expect(socket.joined).toContain('c1');
    expect(store.peer(OTHER).name).toBe('Mamadou Pro');
    expect(store.totalUnread()).toBe(1);
  });

  it('openWith : find-or-create → ouverture → historique → lecture, et refuse soi-même', async () => {
    await flush();
    const id = await store.openWith(OTHER);
    expect(id).toBe('c1');
    expect(api.findOrCreateCalls).toEqual([OTHER]);
    expect(store.activeConversationId()).toBe('c1');
    expect(store.messages().map((m) => m._id)).toEqual(['h1']);
    expect(socket.read).toContain('h1'); // message reçu non lu → message_read
    expect(store.conversations()[0].unread_count).toBe(0);

    expect(await store.openWith(ME)).toBeNull();
    expect(store.error()).toContain('vous-même');
  });

  it("ne duplique pas un message reçu à la fois par l'ACK et par message:new", async () => {
    await flush();
    await store.openWith(OTHER);

    expect(await store.send('Salut')).toBe(true);
    // Le serveur émet aussi dans la room (émetteur compris) : même _id.
    socket.messageNew$.next(msg({ _id: 'm-ack', sender: ME, recipient: OTHER, content: 'Salut' }));
    socket.messageNew$.next(msg({ _id: 'm-ack', sender: ME, recipient: OTHER, content: 'Salut' }));

    const ids = store.messages().map((m) => m._id);
    expect(ids).toEqual(['h1', 'm-ack']);
    expect(socket.delivered).toEqual([]); // on n'accuse pas réception de ses propres messages
  });

  it('message entrant dans la conversation active : ajouté, delivered + read émis une seule fois', async () => {
    await flush();
    await store.openWith(OTHER);
    socket.read = [];

    socket.messageNew$.next(msg({ _id: 'in1', created_at: '2026-10-09T11:00:00.000Z' }));
    socket.messageNew$.next(msg({ _id: 'in1', created_at: '2026-10-09T11:00:00.000Z' })); // doublon réseau

    expect(store.messages().map((m) => m._id)).toEqual(['h1', 'in1']);
    expect(socket.delivered).toEqual(['in1']);
    expect(socket.read).toEqual(['in1']);
    expect(store.conversations()[0].unread_count).toBe(0);
  });

  it("message entrant dans une autre conversation : incrémente les non-lus, pas de read", async () => {
    await flush();
    store.conversations.update((l) => [...l, { _id: 'c2', participant_one: ME, participant_two: 'u3', other_participant: 'u3', unread_count: 0, last_message_id: null, last_message_at: null } as any]);
    await store.openWith(OTHER);
    socket.read = [];

    socket.messageNew$.next(msg({ _id: 'z1', conversation: 'c2', sender: 'u3' }));
    const c2 = store.conversations().find((c) => c._id === 'c2')!;
    expect(c2.unread_count).toBe(1);
    expect(store.conversations()[0]._id).toBe('c2'); // remontée en tête
    expect(socket.read).toEqual([]);
    expect(socket.delivered).toEqual(['z1']);
  });

  it("message:status fait progresser le statut sans jamais le rétrograder, et ignore nos propres accusés", async () => {
    await flush();
    await store.openWith(OTHER);
    await store.send('Salut');

    socket.messageStatus$.next({ messageId: 'm-ack', status: 'read', user_id: OTHER });
    expect(store.messages().find((m) => m._id === 'm-ack')!.status).toBe('read');

    socket.messageStatus$.next({ messageId: 'm-ack', status: 'delivered', user_id: OTHER });
    expect(store.messages().find((m) => m._id === 'm-ack')!.status).toBe('read');

    socket.messageStatus$.next({ messageId: 'h1', status: 'read', user_id: ME });
    expect(store.messages().find((m) => m._id === 'h1')!.status).toBe('sent');
  });

  it("typing : affiché pour l'interlocuteur uniquement, et retombe à la réception d'un message", async () => {
    await flush();
    await store.openWith(OTHER);

    socket.typing$.next({ conversationId: 'c1', user_id: ME, isTyping: true });
    expect(store.peerIsTyping()).toBe(false);

    socket.typing$.next({ conversationId: 'c1', user_id: OTHER, isTyping: true });
    expect(store.peerIsTyping()).toBe(true);

    socket.messageNew$.next(msg({ _id: 'in2' }));
    expect(store.peerIsTyping()).toBe(false);
  });

  it('repli REST quand le socket est déconnecté', async () => {
    await flush();
    await store.openWith(OTHER);
    socket.isConnected = false;
    expect(await store.send('hors ligne')).toBe(true);
    expect(store.messages().some((m) => m._id === 'm-rest')).toBe(true);
  });

  it('présence : presence:update alimente isOnline', async () => {
    await flush();
    socket.presenceUpdate$.next({ user_id: OTHER, online: true, last_seen: 'now' });
    expect(store.isOnline(OTHER)).toBe(true);
    socket.presenceUpdate$.next({ user_id: OTHER, online: false, last_seen: 'now' });
    expect(store.isOnline(OTHER)).toBe(false);
  });
});
