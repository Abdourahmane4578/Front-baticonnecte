import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { chatIdentityInterceptor } from './chat-identity.interceptor';
import { AuthService } from '../auth';
import { environment } from '../../../environments/environment';
import { API_URL } from '../../config/config';

describe('chatIdentityInterceptor (dev uniquement)', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([chatIdentityInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'uuid-moi' }) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it("ajoute x-user-id uniquement vers l'URL du service Chat quand le flag dev est actif", () => {
    http.get(`${environment.chat.apiUrl}/api/conversations`).subscribe();
    const req = ctrl.expectOne(`${environment.chat.apiUrl}/api/conversations`);
    if (environment.chat.devIdentityHeader) {
      expect(req.request.headers.get('x-user-id')).toBe('uuid-moi');
    } else {
      expect(req.request.headers.has('x-user-id')).toBe(false);
    }
    req.flush({ success: true, data: [] });
  });

  it("n'ajoute JAMAIS x-user-id vers l'API Spring BatiConnecte", () => {
    http.get(`${API_URL}/users`).subscribe();
    const req = ctrl.expectOne(`${API_URL}/users`);
    expect(req.request.headers.has('x-user-id')).toBe(false);
    req.flush([]);
  });
});
