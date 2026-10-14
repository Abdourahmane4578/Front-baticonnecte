import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, switchMap, map, catchError } from 'rxjs/operators';
import { API_URL } from '../config/config';
import { JobService } from './job.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // BehaviorSubject permet de stocker l'état et de le diffuser
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  
  // Observable que les composants vont écouter
  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private jobService: JobService
  ) {}

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${API_URL}/auth/login`, credentials).pipe(
      switchMap((response: any) => {
        if (response && (response.token || response.data?.token)) {
          const token = response.token || response.data?.token;

          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', token);
          }

          // Important : signaler immédiatement l'état connecté pour rafraîchir la navbar / UI.
          this.loggedIn.next(true);

          // Récupère les informations de l'utilisateur fraîchement connecté via l'API "me"
          return this.getProfile().pipe(
            tap(() => {
              this.loggedIn.next(true);
              this.jobService.fetchPosts(1, 20).subscribe();
            }),
            map(() => response),
            catchError((err) => {
              console.error("Erreur lors de la récupération du profil via /auth/me", err);
              if (isPlatformBrowser(this.platformId)) {
                const nomComplet = response.username || response.nomComplet || response.data?.username || 'Utilisateur';
                localStorage.setItem('user', JSON.stringify({
                  id: response.id || response.data?.id || '',
                  nomComplet,
                  username: nomComplet,
                  email: response.email || response.data?.email || '',
                  role: response.role || response.data?.role || '',
                  adresse: '',
                  ville: '',
                  statut: ''
                }));
              }
              this.loggedIn.next(true);
              this.jobService.fetchPosts(1, 20).subscribe();
              return of(response);
            })
          );
        }
        return of(response);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${API_URL}/auth/register`, userData).pipe(
      tap((response: any) => {
        // Le backend ne retourne pas de token à l'inscription
        // On redirigera l'utilisateur vers la page de login après le succès
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.loggedIn.next(false);
  }

  // Pour obtenir la valeur actuelle rapidement
  get isUserConnected(): boolean {
    return this.loggedIn.value;
  }

  // Récupérer les informations de l'utilisateur connecté
  getUser(): any {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          console.error('Erreur lors du parsing des informations utilisateur', e);
          return null;
        }
      }
    }
    return null;
  }

  // Jeton JWT courant (null côté serveur ou si déconnecté)
  getToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
  }

  // Récupérer le profil depuis l'API
  getProfile(): Observable<any> {
    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };

    return this.http.get(`${API_URL}/auth/me`, httpOptions).pipe(
      tap((user: any) => {
        if (isPlatformBrowser(this.platformId)) {
          const userData = user.data ? user.data : user;
          const existingUser = this.getUser() || {};

          const nomComplet = userData.nomComplet || existingUser.nomComplet || existingUser.username || 'Utilisateur';
          const updatedUser = {
            id: userData.id || existingUser.id || '',
            nomComplet,
            username: nomComplet,
            email: userData.email || existingUser.email || '',
            adresse: userData.adresse ?? existingUser.adresse ?? '',
            ville: userData.ville ?? existingUser.ville ?? '',
            role: userData.role || existingUser.role || '',
            statut: userData.statut ?? existingUser.statut ?? '',
            createdAt: userData.createdAt ?? existingUser.createdAt,
            imageUrl: existingUser.imageUrl || ''
          };

          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.loggedIn.next(true);
        }
      })
    );
  }
}
