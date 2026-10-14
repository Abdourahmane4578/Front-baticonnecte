import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { API_URL } from '../config/config';

/**
 * JobService
 * Service centralisé pour la gestion des annonces du Job Board.
 * Connecté à l'API backend GET /api/v1/posts?page=1&limit=10 avec fallback réactif.
 */
@Injectable({
  providedIn: 'root'
})
export class JobService {

  /**
   * Source de vérité réactive pour la liste des annonces.
   * On laisse la liste vide au démarrage pour utiliser uniquement les données de la base.
   */
  private annoncesSubject = new BehaviorSubject<any[]>([]);

  /** Observable public exposé aux composants pour s'abonner aux changements */
  annonces$ = this.annoncesSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Charge automatiquement les posts uniquement si l'utilisateur est connecté
    // et possède un token valide. Sinon on évite le 401 au démarrage.
    if (isPlatformBrowser(this.platformId) && this.getToken()) {
      this.fetchPosts().subscribe();
    }
  }

  private getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  /**
   * Récupère la liste des posts depuis l'API GET /api/v1/posts?page=1&limit=10
   * @param page Numéro de la page (par défaut 1)
   * @param limit Nombre d'éléments par page (par défaut 10)
   */
  fetchPosts(page: number = 1, limit: number = 10): Observable<any> {
    const token = this.getToken();

    if (!token) {
      this.annoncesSubject.next([]);
      return of(null);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    // Le front compte les pages à partir de 1, la pagination Spring du backend à partir de 0.
    const backendPage = Math.max(0, page - 1);

    return this.http.get<any>(`${API_URL}/posts?page=${backendPage}&limit=${limit}`, { headers }).pipe(
      tap((response: any) => {
        let items: any[] = [];
        if (response && Array.isArray(response.data)) {
          items = response.data;
        } else if (Array.isArray(response)) {
          items = response;
        }

        const existing = this.getAnnonces();

        if (items.length > 0) {
          const formatted = items.map((p: any) => this.mapPostToAnnonce(p));
          const merged = [...formatted, ...existing.filter((x: any) => !formatted.some((y: any) => y.id === x.id))];
          this.annoncesSubject.next(merged);
        } else {
          this.annoncesSubject.next(existing.length > 0 ? existing : []);
        }
      }),
      catchError((err) => {
        if (err?.status === 401) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
          this.annoncesSubject.next([]);
          return of(null);
        }

        console.error("Erreur lors de la récupération des posts depuis l'API :", err);
        this.annoncesSubject.next(this.getAnnonces().length > 0 ? this.getAnnonces() : []);
        return of(null);
      })
    );
  }

  /**
   * Retourne un post déjà présent dans le store local si disponible.
   */
  getLocalPostById(id: number | string): any {
    return this.getAnnonces().find((item: any) => String(item.id) === String(id)) || null;
  }

  /**
   * Récupère un post précis par son identifiant.
   * Endpoint backend : GET /api/v1/posts/{id}
   */
  getPostById(id: number | string): Observable<any> {
    const cached = this.getLocalPostById(id);
    if (cached) {
      return of(cached);
    }

    if (!id) {
      return of(null);
    }

    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();

    return this.http.get<any>(`${API_URL}/posts/${id}`, { headers }).pipe(
      map((response: any) => {
        const payload = response && response.data ? response.data : response;
        const item = payload && payload.post ? payload.post : payload;

        if (!item || typeof item !== 'object') {
          return this.getLocalPostById(id);
        }

        const normalized = this.mapPostToAnnonce(item);
        const current = this.getAnnonces();
        const existingIndex = current.findIndex((entry: any) => String(entry.id) === String(normalized.id));

        if (existingIndex >= 0) {
          const updated = [...current];
          updated[existingIndex] = normalized;
          this.annoncesSubject.next(updated);
        } else {
          this.annoncesSubject.next([normalized, ...current]);
        }

        return normalized;
      }),
      catchError((err) => {
        console.error(`Erreur lors de la récupération du post ${id} :`, err);
        const fallback = this.getLocalPostById(id);
        if (err?.status === 401) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
        return of(fallback);
      })
    );
  }

  /**
   * Crée un nouveau post via l'API POST /api/v1/posts
   * Transmet un FormData avec (titre, description, userId, file)
   * et reçoit la réponse : { id, titre, description, image, userId }
   */
  createPost(data: { titre: string; description: string; file?: File }): Observable<any> {
    let userId = '';
    try {
      const userStr = isPlatformBrowser(this.platformId) ? localStorage.getItem('user') : null;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id || user.userId || '';
      }
    } catch (e) {
      console.error("Erreur de récupération de l'utilisateur connecté :", e);
    }

    const formData = new FormData();
    formData.append('titre', data.titre ?? '');
    formData.append('description', data.description ?? '');
    if (userId) {
      formData.append('userId', userId);
    }

    if (data.file) {
      formData.append('file', data.file, data.file.name);
    } else {
      // Génère une image PNG transparente 1x1 si l'utilisateur ne téléverse pas de fichier
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const byteChars = atob(dummyBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      formData.append('file', blob, 'default.png');
    }

    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });

    return this.http.post<any>(`${API_URL}/posts`, formData, { headers }).pipe(
      tap((response: any) => {
        const payload = response && typeof response === 'object' ? response : {};
        const normalizedResponse = {
          ...payload,
          titre: payload.titre ?? data.titre ?? 'Annonce',
          description: payload.description ?? data.description ?? 'Aucune description fournie.',
          image: payload.image ?? payload.imageUrl ?? null,
          imageUrl: payload.imageUrl ?? payload.image ?? null,
          userId: payload.userId ?? userId,
          fullName: payload.fullName ?? ''
        };

        const newAnnonce = this.mapPostToAnnonce(normalizedResponse);
        const currentList = this.getAnnonces();
        this.annoncesSubject.next([newAnnonce, ...currentList]);
      }),
      catchError((err) => {
        console.error("Erreur lors de la création du post via l'API :", err);
        // Fallback local si l'API échoue
        this.addAnnonce(data);
        return of(null);
      })
    );
  }

  /**
   * Mappe un post retourné par l'API backend vers le format attendu par les composants
   */
  private mapPostToAnnonce(p: any): any {
    const imageUrl = p?.imageUrl ?? p?.image ?? null;
    const fullName = p?.fullName ?? p?.client ?? '';

    return {
      id: p?.id ?? 0,
      titre: p?.titre ?? 'Annonce',
      description: p?.description ?? '',
      imageUrl,
      image: imageUrl,
      userId: p?.userId ?? p?.authorId ?? 0,
      authorId: p?.userId ?? p?.authorId ?? 0,
      fullName,
      client: fullName,
      createdAt: p?.createdAt ?? null,
      updatedAt: p?.updatedAt ?? null,
      date: p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : (p?.date ?? ''),
      likes: 0,
      likedByMe: false,
      comments: p?.comments ?? []
    };
  }

  /**
   * Retourne la valeur instantanée de la liste des annonces (snapshot).
   */
  getAnnonces() {
    return this.annoncesSubject.value;
  }

  /**
   * Ajoute une nouvelle annonce en tête de liste.
   * @param annonce - Les données du formulaire de publication
   */
  addAnnonce(annonce: any) {
    const currentList = this.getAnnonces();

    const newAnnonce = {
      ...annonce,
      id:         currentList.length + 1,
      date:       'À l\'instant',
      client:     'Moi (Client)',
      authorId:   1,
      likes:      0,
      likedByMe:  false,
      comments:   []
    };

    this.annoncesSubject.next([newAnnonce, ...currentList]);
  }

  /**
   * Supprime une annonce depuis l'API backend.
   * Endpoint backend : DELETE /api/v1/posts/{id}
   */
  deleteAnnonce(id: number | string): Observable<any> {
    const token = this.getToken();

    if (!id) {
      return of(null);
    }

    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();

    return this.http.delete<any>(`${API_URL}/posts/${id}`, { headers, responseType: 'text' as 'json' }).pipe(
      map((response: any) => {
        const currentList = this.getAnnonces();
        const updatedList = currentList.filter((a: any) => String(a.id) !== String(id));
        this.annoncesSubject.next(updatedList);
        return response;
      }),
      catchError((err) => {
        console.error(`Erreur suppression post ${id} :`, err);
        const currentList = this.getAnnonces();
        const updatedList = currentList.filter((a: any) => String(a.id) !== String(id));
        this.annoncesSubject.next(updatedList);
        return of({ success: true, localOnly: true });
      })
    );
  }

  /**
   * Modifie un post via l'API PATCH /api/v1/posts/{id} (multipart : titre, description, file).
   * Seul l'auteur du post est autorisé côté backend. Le champ `file` est obligatoire
   * pour Spring mais ignoré s'il est vide : on envoie un Blob vide quand il n'y a pas de nouvelle image.
   * En cas d'échec, la modification est appliquée localement (editAnnonce).
   */
  updatePost(id: number | string, data: { titre?: string; description?: string; file?: File }): Observable<any> {
    if (!id) {
      return of(null);
    }

    const formData = new FormData();
    if (data.titre != null) formData.append('titre', data.titre);
    if (data.description != null) formData.append('description', data.description);
    if (data.file) {
      formData.append('file', data.file, data.file.name);
    } else {
      formData.append('file', new Blob([]), 'empty');
    }

    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();

    return this.http.patch<any>(`${API_URL}/posts/${id}`, formData, { headers }).pipe(
      tap((response: any) => {
        const payload = response?.data ?? response;
        if (payload && typeof payload === 'object') {
          const current = this.getAnnonces();
          const existing = current.find((a: any) => String(a.id) === String(id)) || {};
          const normalized = this.mapPostToAnnonce({ ...existing, ...payload });
          this.annoncesSubject.next(
            current.map((a: any) => (String(a.id) === String(id) ? { ...a, ...normalized } : a))
          );
        } else {
          this.editAnnonce(id, data);
        }
      }),
      catchError((err) => {
        console.error(`Erreur modification post ${id} :`, err);
        this.editAnnonce(id, data);
        return of(null);
      })
    );
  }

  /**
   * Met à jour les champs d'une annonce existante (état local uniquement).
   * @param id   - L'identifiant de l'annonce à modifier
   * @param data - Les nouvelles données à fusionner
   */
  editAnnonce(id: number | string, data: any) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => a.id === id ? { ...a, ...data } : a);
    this.annoncesSubject.next(updatedList);
  }

  /**
   * Ajoute un commentaire à une annonce.
   * @param postId - L'identifiant de l'annonce à commenter
   * @param author - Le nom de l'auteur du commentaire
   * @param text   - Le contenu du commentaire
   */
  addComment(postId: number | string, author: string, text: string) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => {
      if (a.id === postId) {
        return {
          ...a,
          comments: [...(a.comments || []), { id: Date.now(), author, text }]
        };
      }
      return a;
    });
    this.annoncesSubject.next(updatedList);
  }

  /**
   * Bascule le like d'un post pour l'utilisateur connecté.
   * @param postId - L'identifiant du post à liker/unliker
   */
  toggleLike(postId: number | string) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => {
      if (a.id === postId) {
        const isLiked = !a.likedByMe;
        return {
          ...a,
          likedByMe: isLiked,
          likes:     isLiked ? a.likes + 1 : a.likes - 1
        };
      }
      return a;
    });
    this.annoncesSubject.next(updatedList);
  }
}

