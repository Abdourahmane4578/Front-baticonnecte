import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { API_URL } from '../config/config';
import { headers } from '../config/header';

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
    @Inject(PLATFORM_ID) private platformId: Object
  
    
  ) {}

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${API_URL}/auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.token);
            // Sauvegarde des informations de l'utilisateur
            // Le backend renvoie nomComplet, ville, adresse (voir swagger RegisterUserDto / UserEntity)
            localStorage.setItem('user', JSON.stringify({
              id: response.id,
              username: response.nomComplet || response.username || 'Utilisateur',
              email: response.email,
              role: response.role,
              ville: response.ville || '',
              adresse: response.adresse || ''
            }));
          }
          this.loggedIn.next(true);
        }
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
}