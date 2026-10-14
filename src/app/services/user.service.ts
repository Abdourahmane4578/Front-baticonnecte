import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_URL } from '../config/config';

export interface UserSummary {
  id?: string;
  nomComplet?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  role?: string;
  statut?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private listSub = new BehaviorSubject<UserSummary[]>([]);
  public users$ = this.listSub.asObservable();

  constructor(private http: HttpClient) {
    this.loadAll().subscribe();
  }

  loadAll(): Observable<any> {
    return this.http.get<any>(`${API_URL}/users`).pipe(
      tap((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list && list.length) this.listSub.next(list);
      }),
      catchError(err => {
        console.warn('API /users non disponible', err?.status);
        return of(null);
      })
    );
  }

  getById(id: number | string) {
    return this.http.get(`${API_URL}/users/${id}`).pipe(catchError(() => of(null)));
  }

  /** Supprime un utilisateur (DELETE /users/{id}, rôle ADMIN). Retire l'entrée de la liste locale en cas de succès. */
  delete(id: number | string): Observable<string | null> {
    return this.http.delete(`${API_URL}/users/${id}`, { responseType: 'text' }).pipe(
      tap(() => this.listSub.next(this.listSub.value.filter(u => String(u.id) !== String(id)))),
      catchError(err => {
        console.error('Erreur suppression utilisateur', err?.status, err?.error);
        return of(null);
      })
    );
  }

  uploadProfileImage(id: number | string, file: File) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.patch(`${API_URL}/users/${id}/upload-profile`, fd).pipe(
      catchError(err => {
        console.error('Erreur upload profile', err);
        return of(null);
      })
    );
  }
}
