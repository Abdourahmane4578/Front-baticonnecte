import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_URL } from '../config/config';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class ArtisanService {
  private artisansSubject = new BehaviorSubject<any[]>([]);
  artisans$ = this.artisansSubject.asObservable();

  constructor(
    private http: HttpClient,
    private profileService: ProfileService,
  ) {
    this.loadArtisans().subscribe();
  }

  private normalizeRole(value: unknown): string {
    return String(value ?? '').trim().toUpperCase();
  }

  /** GetProfileDto → carte UI. `id` = userId (route /profil/:id). */
  private mapProfileToArtisan(profile: any): any {
    const nomComplet = profile.nomComplet || 'Artisan';
    return {
      id: profile.userId || profile.id,
      profileId: profile.id,
      nomComplet,
      name: nomComplet,
      nom: profile.nom || '',
      job: profile.nom || 'Ouvrier / Artisan',
      ville: profile.ville || '',
      city: profile.ville || '',
      email: profile.email || '',
      adresse: profile.adresse || '',
      description: profile.description || '',
      metierId: profile.metierId || null,
      imageUrl: profile.imageUrl || profile.image || '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      role: 'OUVRIER'
    };
  }

  /** getUserByIdResponseDto (OUVRIER sans offre). */
  private mapUserToArtisan(user: any): any {
    const nomComplet = user.nomComplet || user.email || 'Artisan';
    return {
      id: user.id,
      profileId: null,
      nomComplet,
      name: nomComplet,
      nom: '',
      job: 'Ouvrier / Artisan',
      ville: user.ville || '',
      city: user.ville || '',
      email: user.email || '',
      adresse: user.adresse || '',
      description: '',
      metierId: null,
      imageUrl: user.imageUrl || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: this.normalizeRole(user.role)
    };
  }

  /**
   * Charge les artisans : profils (GET /profiles) en priorité, puis les comptes
   * OUVRIER de GET /users qui n'ont pas encore publié d'offre.
   */
  loadArtisans(opts: { filter?: string; metierId?: string } = {}): Observable<any> {
    return forkJoin({
      profiles: this.profileService.list({ ...opts, page: 0, limit: 200 }),
      users: this.http.get<any>(`${API_URL}/users?page=0&limit=200`).pipe(
        catchError(() => of({ data: [] })),
      ),
    }).pipe(
      tap(({ profiles, users }) => {
        const fromProfiles = (profiles.data || []).map((p) => this.mapProfileToArtisan(p));
        const seen = new Set(fromProfiles.map((a) => String(a.id)));
        const rawUsers = Array.isArray(users) ? users : (users?.data || []);
        const q = (opts.filter || '').trim().toLowerCase();
        const fromUsers = rawUsers
          .filter((u: any) => {
            const role = this.normalizeRole(u?.role);
            return role === 'OUVRIER' || role === 'ARTISAN';
          })
          .filter((u: any) => !seen.has(String(u.id)))
          .filter((u: any) => !opts.metierId)
          .filter((u: any) => {
            if (!q) return true;
            const blob = `${u.nomComplet || ''} ${u.ville || ''} ${u.adresse || ''}`.toLowerCase();
            return blob.includes(q);
          })
          .map((u: any) => this.mapUserToArtisan(u));
        this.artisansSubject.next([...fromProfiles, ...fromUsers]);
      }),
      catchError((err) => {
        console.warn('Liste artisans indisponible.', err?.status);
        this.artisansSubject.next([]);
        return of(null);
      }),
    );
  }

  getArtisans() {
    return this.artisansSubject.value;
  }

  /**
   * Publie une offre d'artisan.
   * Côté API : POST /profiles attend un CreateMetierDto { userId, metierId, description }
   * (rôle OUVRIER requis). L'état local est mis à jour dans tous les cas pour l'affichage.
   * @returns l'Observable de l'appel API (null si l'appel a échoué ou n'a pas pu être fait)
   */
  addArtisan(artisan: {
    name: string; job: string; city: string; price: string;
    userId?: string; metierId?: string; description?: string;
  }): Observable<any> {
    const currentList = this.getArtisans();
    const nomComplet = artisan.name || 'Artisan';
    const newArtisan = {
      id: artisan.userId || currentList.length + 1,
      profileId: null,
      nomComplet,
      name: nomComplet,
      nom: artisan.job || '',
      job: artisan.job || '',
      ville: artisan.city || '',
      city: artisan.city || '',
      description: artisan.description || '',
      metierId: artisan.metierId || null,
      role: 'OUVRIER'
    };

    this.artisansSubject.next([newArtisan, ...currentList.filter(a => a.id !== newArtisan.id)]);

    if (!artisan.userId || !artisan.metierId) {
      console.warn('POST /profiles ignoré : userId ou metierId manquant.');
      return of(null);
    }

    const payload = {
      userId: artisan.userId,
      metierId: artisan.metierId,
      description: artisan.description || `${artisan.job} — ${artisan.city}`
    };

    return this.http.post(`${API_URL}/profiles`, payload).pipe(
      tap(() => this.loadArtisans().subscribe()),
      catchError((err) => {
        console.error('Erreur création profil ouvrier (POST /profiles)', err?.status, err?.error);
        return of(null);
      })
    );
  }

  toggleProfileStatus(id: number | string) {
    const currentList = this.getArtisans();
    const updatedList = currentList.map(a => {
      if (a.id === id) {
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    this.artisansSubject.next(updatedList);
  }

  updateProfile(id: number | string, data: any) {
    const currentList = this.getArtisans();
    const updatedList = currentList.map(a => {
      if (a.id === id) {
        return { ...a, ...data };
      }
      return a;
    });
    this.artisansSubject.next(updatedList);
  }
}

