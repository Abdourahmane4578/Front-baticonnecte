import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_URL } from '../config/config';

export interface Metier {
  id?: number | string;
  nom?: string;
  name?: string;
  label?: string;
  description?: string;
  statut?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class MetierService {
  private initial: Metier[] = [];
  private subject = new BehaviorSubject<Metier[]>(this.initial);
  public list$ = this.subject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadAll().subscribe();
  }

  private getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  private normalizeMetier(item: any): Metier {
    return {
      ...item,
      id: item?.id ?? item?._id,
      nom: item?.nom ?? item?.name ?? item?.label ?? '',
      description: item?.description ?? '',
      statut: item?.statut ?? item?.status ?? 'ACTIF'
    };
  }

  private toApiPayload(m: Metier) {
    return {
      nom: m.nom ?? m.name ?? m.label ?? '',
      description: m.description ?? '',
      statut: m.statut ?? m.status ?? 'ACTIF'
    };
  }

  loadAll(): Observable<any> {
    return this.http.get<any>(`${API_URL}/metiers`).pipe(
      tap((res: any) => {
        const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        const list = rawList.map((item: any) => this.normalizeMetier(item));
        console.log('Liste métiers reçue depuis l’API :', list);
        this.subject.next(list);
      }),
      catchError(err => {
        console.warn('API /metiers non disponible, fallback vide', err?.status);
        this.subject.next([]);
        return of(null);
      })
    );
  }

  create(m: Metier): Observable<any> {
    const payload = this.toApiPayload(m);
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });

    console.log('Create métier payload:', payload);
    console.log('Token présent pour /metiers ?', !!token);

    return this.http.post(`${API_URL}/metiers`, payload, { headers }).pipe(
      tap((res: any) => {
        const created = res && (res.data ?? res);
        const current = this.subject.value;

        if (created) {
          const normalized = this.normalizeMetier(created);
          const alreadyExists = current.some(item => String(item.id) === String(normalized.id));
          if (!alreadyExists) {
            this.subject.next([normalized, ...current]);
          }
        }

        this.loadAll().subscribe();
      }),
      catchError(err => {
        console.error('Erreur création métier détaillée:', err);
        return of(null);
      })
    );
  }

  update(id: number | string, m: Metier): Observable<any> {
    const payload = this.toApiPayload(m);
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });

    console.log('Update métier id:', id, 'payload:', payload);

    return this.http.patch(`${API_URL}/metiers/${id}`, payload, { headers }).pipe(
      tap((res: any) => {
        const updated = res && (res.data ?? res);
        const current = this.subject.value;

        if (updated) {
          const normalized = this.normalizeMetier(updated);
          const next = current.map(item => String(item.id) === String(id) ? normalized : item);
          this.subject.next(next);
        }

        this.loadAll().subscribe();
      }),
      catchError(err => {
        console.error('Erreur modification métier détaillée:', err);
        return of(null);
      })
    );
  }

  getById(id: number | string) {
    return this.http.get(`${API_URL}/metiers/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  delete(id: number | string) {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });

    console.log('Suppression métier id:', id);

    return this.http.delete(`${API_URL}/metiers/${id}`, {
      headers,
      responseType: 'text' as 'json'
    }).pipe(
      tap((res) => {
        console.log('Métier supprimé :', id, 'Réponse brute:', res);
        this.loadAll().subscribe();
      }),
      catchError(err => {
        console.error('Erreur suppression métier :', err);
        return of(null);
      })
    );
  }
}
