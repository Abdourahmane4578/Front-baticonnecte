import { TestBed } from '@angular/core/testing';
import { CHAT_SOCKET_FACTORY, ChatSocketService } from './chat-socket.service';
import { AuthService } from '../auth';

/** Faux socket.io-client : enregistre les émissions et permet de déclencher des événements. */
class FakeSocket {
  connected = false;
  emitted: { event: string; payload: any; ack?: Function }[] = [];
  private handlers = new Map<string, Function[]>();
  io = { on: (_: string, __: Function) => this.io };
  connectCalls = 0;

  on(event: string, fn: Function) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
    return this;
  }
  emit(event: string, payload: any, ack?: Function) {
    this.emitted.push({ event, payload, ack });
    return this;
  }
  timeout() {
    return this;
  }
  connect() {
    this.connectCalls++;
    return this;
  }
  disconnect() {
    this.connected = false;
    return this;
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }
  /** Simule un événement serveur. */
  fire(event: string, ...args: any[]) {
    for (const h of this.handlers.get(event) ?? []) h(...args);
  }
}

describe('ChatSocketService', () => {
  let service: ChatSocketService;
  let fake: FakeSocket;
  let created = 0;

  beforeEach(() => {
    created = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CHAT_SOCKET_FACTORY,
          useValue: () => {
            created++;
            fake = new FakeSocket();
            return fake as any;
          },
        },
        { provide: AuthService, useValue: { getUser: () => ({ id: 'uuid-moi' }), getToken: () => 'jwt' } },
      ],
    });
    service = TestBed.inject(ChatSocketService);
  });

  it("n'ouvre qu'une seule connexion même si connect() est appelé plusieurs fois", () => {
    service.connect();
    service.connect();
    service.connect();
    expect(created).toBe(1);
  });

  it('rejoint les rooms mémorisées à chaque (re)connexion', () => {
    service.connect();
    service.joinConversation('c1'); // socket pas encore connecté → mémorisé seulement
    expect(fake.emitted.filter((e) => e.event === 'join_conversation').length).toBe(0);

    fake.connected = true;
    fake.fire('connect');
    expect(fake.emitted.filter((e) => e.event === 'join_conversation').map((e) => e.payload)).toEqual([
      { conversationId: 'c1' },
    ]);
    expect(service.state()).toBe('connected');

    // Coupure réseau puis reconnexion : la room est rejointe à nouveau.
    fake.fire('disconnect', 'transport close');
    expect(service.state()).toBe('reconnecting');
    fake.fire('connect');
    expect(fake.emitted.filter((e) => e.event === 'join_conversation').length).toBe(2);
  });

  it('send_message résout avec data sur ACK success et rejette sur success:false', async () => {
    service.connect();
    fake.connected = true;
    fake.fire('connect');

    const p1 = service.sendMessage({ conversationId: 'c1', content: 'Salut' });
    const e1 = fake.emitted.find((e) => e.event === 'send_message')!;
    expect(e1.payload).toEqual({ conversationId: 'c1', content: 'Salut' });
    e1.ack!(null, { success: true, data: { _id: 'm1', content: 'Salut' } });
    await expect(p1).resolves.toMatchObject({ _id: 'm1' });

    const p2 = service.sendMessage({ conversationId: 'c-autre', content: 'x' });
    const e2 = fake.emitted.filter((e) => e.event === 'send_message')[1];
    e2.ack!(null, { success: false, message: 'You are not allowed to send messages in this conversation' });
    await expect(p2).rejects.toThrow(/not allowed/);
  });

  it('rejette immédiatement si le socket est déconnecté (repli REST côté store)', async () => {
    service.connect();
    await expect(service.markRead('m1')).rejects.toThrow(/déconnecté/);
  });

  it('relaie les événements serveur dans des observables typés', () => {
    service.connect();
    const received: any[] = [];
    service.onMessageNew.subscribe((m) => received.push(m));
    service.onPresenceUpdate.subscribe((p) => received.push(p));
    fake.fire('message:new', { _id: 'm9', content: 'yo' });
    fake.fire('presence:update', { user_id: 'u2', online: true });
    expect(received.length).toBe(2);
  });
});
