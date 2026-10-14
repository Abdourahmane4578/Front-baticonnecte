import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_URL } from '../config/config';
import { CreateProfileDto, GetProfileDto, PageResponseDto } from '../models/api';

export type { GetProfileDto as OuvrierProfile, CreateProfileDto as CreateProfilePayload };

/**
 * Client REST des profils ouvriers.
 *   GET    /api/v1/profiles?filter&metierId&page&limit  → PageResponseDto<GetProfileDto>
 *   POST   /api/v1/profiles                             → ProfileEntity (CreateProfileDto)
 *   GET    /api/v1/profiles/user/{userId}               → GetProfileDto
 *   DELETE /api/v1/profiles/{id}                        → String
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  list(opts: { filter?: string; metierId?: string; page?: number; limit?: number } = {}): Observable<PageResponseDto<GetProfileDto>> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('limit', String(opts.limit ?? 200));
    if (opts.filter?.trim()) params = params.set('filter', opts.filter.trim());
    if (opts.metierId) params = params.set('metierId', opts.metierId);

    return this.http.get<PageResponseDto<GetProfileDto>>(`${API_URL}/profiles`, { params }).pipe(
      map((res) => ({
        data: Array.isArray(res?.data) ? res.data : [],
        page: Number(res?.page) || 1,
        limit: Number(res?.limit) || (opts.limit ?? 200),
        totalElements: Number(res?.totalElements) || 0,
        totalPages: Number(res?.totalPages) || 1,
      })),
      catchError((err) => {
        console.warn('API GET /profiles indisponible', err?.status);
        return of({ data: [], page: 1, limit: opts.limit ?? 200, totalElements: 0, totalPages: 1 });
      }),
    );
  }

  getByUser(userId: string): Observable<GetProfileDto | null> {
    if (!userId) return of(null);
    return this.http.get<GetProfileDto>(`${API_URL}/profiles/user/${userId}`).pipe(
      map((res) => (res as GetProfileDto) ?? null),
      catchError((err) => {
        if (err?.status !== 404) console.warn(`API /profiles/user/${userId} indisponible`, err?.status);
        return of(null);
      }),
    );
  }

  create(payload: CreateProfileDto): Observable<any> {
    return this.http.post(`${API_URL}/profiles`, payload);
  }

  delete(profileId: string): Observable<string | null> {
    return this.http
      .delete(`${API_URL}/profiles/${profileId}`, { responseType: 'text' })
      .pipe(catchError((err) => { console.error('Erreur suppression profil', err); return of(null); }));
  }
}
