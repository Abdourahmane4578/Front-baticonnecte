import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatApiError, ChatApiService } from './chat-api.service';
import { environment } from '../../../environments/environment';

const BASE = environment.chat.apiUrl;

describe('ChatApiService (endpoints documentés du service Chat)', () => {
  let service: ChatApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ChatApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POST /api/conversations/find-or-create avec { participant_id } et déballe data', () => {
    let result: any;
    service.findOrCreateConversation('user-b').subscribe((r) => (result = r));

    const req = http.expectOne(`${BASE}/api/conversations/find-or-create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ participant_id: 'user-b' });
    req.flush({ success: true, data: { _id: 'c1', participant_one: 'user-a', participant_two: 'user-b' } });

    expect(result._id).toBe('c1');
  });

  it('GET /api/conversations/{id}/messages?page&limit', () => {
    let page: any;
    service.getMessages('c1', 2, 20).subscribe((p) => (page = p));

    const req = http.expectOne((r) => r.url === `${BASE}/api/conversations/c1/messages`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('20');
    req.flush({ success: true, data: { messages: [], total: 0, page: 2, limit: 20, totalPages: 1 } });

    expect(page.page).toBe(2);
  });

  it('GET /api/conversations (liste)', () => {
    let list: any[] = [];
    service.listConversations().subscribe((l) => (list = l));
    const req = http.expectOne(`${BASE}/api/conversations`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [{ _id: 'c1', unread_count: 2, other_participant: 'user-b' }] });
    expect(list.length).toBe(1);
    expect(list[0].unread_count).toBe(2);
  });

  it('POST /api/messages avec { conversation_id, content, reply_to }', () => {
    service.sendMessage('c1', 'Bonjour', null).subscribe();
    const req = http.expectOne(`${BASE}/api/messages`);
    expect(req.request.body).toEqual({ conversation_id: 'c1', content: 'Bonjour', reply_to: null });
    req.flush({ success: true, data: { _id: 'm1', content: 'Bonjour' } }, { status: 201, statusText: 'Created' });
  });

  it('GET /api/messages/unread-count renvoie total_unread', () => {
    let n = -1;
    service.unreadCount().subscribe((v) => (n = v));
    http.expectOne(`${BASE}/api/messages/unread-count`).flush({ success: true, data: { total_unread: 4 } });
    expect(n).toBe(4);
  });

  it('transforme les erreurs { success:false, message } en ChatApiError avec le statut HTTP', () => {
    let err: any;
    service.getMessages('c-autre').subscribe({ error: (e) => (err = e) });
    http
      .expectOne((r) => r.url.endsWith('/api/conversations/c-autre/messages'))
      .flush({ success: false, message: 'You are not a participant of this conversation' }, { status: 403, statusText: 'Forbidden' });

    expect(err).toBeInstanceOf(ChatApiError);
    expect(err.status).toBe(403);
    expect(err.message).toContain('not a participant');
  });

  it('erreur réseau (status 0) → message « injoignable »', () => {
    let err: any;
    service.listConversations().subscribe({ error: (e) => (err = e) });
    http.expectOne(`${BASE}/api/conversations`).error(new ProgressEvent('error'), { status: 0 });
    expect(err.message).toContain('injoignable');
  });
});
