import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { API_URL } from '../config/config';

/**
 * Modèle d'un Devis
 */
export interface Devis {
  id: string;
  titre: string;
  description: string;
  clientNom: string;
  clientEmail: string;
  artisanNom: string;
  metier: string;
  montantEstime: number;
  adresseTravaux: string;
  dateCreation: string;
  dateSouhaitee: string;
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE' | 'TERMINE';
  authorId: string;
  notes?: string;
}

export interface DevisStats {
  total: number;
  enAttente: number;
  acceptes: number;
  refuses: number;
  termines: number;
  montantTotal: number;
  montantAccepte: number;
}

/**
 * DevisService
 * Gère la liste des devis de manière réactive via BehaviorSubject.
 * Connecté à l'API backend HTTP avec persistance de secours localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class DevisService {

  private readonly STORAGE_KEY = 'baticonnect_devis';

  private initialDevis: Devis[] = [
    {
      id: '1',
      titre: 'Rénovation cuisine complète',
      description: 'Remplacement plan de travail, carrelage mural, peinture plafond et installation nouveau évier.',
      clientNom: 'Mamadou Diallo',
      clientEmail: 'mamadou@email.com',
      artisanNom: 'Ibrahima Bah',
      metier: 'Maçon / Rénovateur',
      montantEstime: 2500000,
      adresseTravaux: 'Kipé, Conakry',
      dateCreation: '2026-08-01',
      dateSouhaitee: '2026-08-15',
      statut: 'EN_ATTENTE',
      authorId: '1',
      notes: ''
    },
    {
      id: '2',
      titre: 'Installation électrique bureau',
      description: 'Mise aux normes installation électrique d\'un bureau de 80m². Ajout de prises et éclairage LED.',
      clientNom: 'Fatoumata Camara',
      clientEmail: 'fatoumata@email.com',
      artisanNom: 'Sékou Konaté',
      metier: 'Électricien',
      montantEstime: 1800000,
      adresseTravaux: 'Ratoma, Conakry',
      dateCreation: '2026-07-28',
      dateSouhaitee: '2026-08-10',
      statut: 'ACCEPTE',
      authorId: '1',
      notes: 'Client disponible le matin.'
    },
    {
      id: '3',
      titre: 'Plomberie salle de bain',
      description: 'Remplacement baignoire par douche italienne, installation nouveau WC suspendu.',
      clientNom: 'Alpha Condé',
      clientEmail: 'alpha@email.com',
      artisanNom: 'Moussa Sylla',
      metier: 'Plombier',
      montantEstime: 3200000,
      adresseTravaux: 'Lambanyi, Conakry',
      dateCreation: '2026-07-20',
      dateSouhaitee: '2026-07-30',
      statut: 'TERMINE',
      authorId: '1',
      notes: 'Travaux terminés avec succès.'
    }
  ];

  private devisSubject: BehaviorSubject<Devis[]>;
  devis$: Observable<Devis[]>;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const saved = this.loadFromStorage();
    this.devisSubject = new BehaviorSubject<Devis[]>(saved.length > 0 ? saved : this.initialDevis);
    this.devis$ = this.devisSubject.asObservable();

    if (saved.length === 0) {
      this.saveToStorage(this.initialDevis);
    }

    this.loadDevisFromApi().subscribe();
  }

  /** Charge les devis depuis l'API HTTP */
  loadDevisFromApi(): Observable<any> {
    return this.http.get<any>(`${API_URL}/devis`).pipe(
      tap((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (list.length > 0) {
          this.emit(list);
        }
      }),
      catchError((err) => {
        console.warn("API /devis non disponible, utilisation du stockage local.", err?.status);
        return of(null);
      })
    );
  }

  // ─── Persistance locale ─────────────────────────────────────────────────────

  private loadFromStorage(): Devis[] {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    }
    return [];
  }

  private saveToStorage(list: Devis[]): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    }
  }

  private emit(list: Devis[]): void {
    this.saveToStorage(list);
    this.devisSubject.next(list);
  }

  // ─── Méthodes CRUD ──────────────────────────────────────────────────────────

  /** Retourne le snapshot courant */
  getAll(): Devis[] {
    return this.devisSubject.value;
  }

  /** Retourne un devis par son ID */
  getById(id: string): Devis | undefined {
    return this.getAll().find(d => d.id === id);
  }

  /** Crée un nouveau devis */
  creer(data: Omit<Devis, 'id' | 'dateCreation' | 'statut'>): Devis {
    const newDevis: Devis = {
      ...data,
      id: Date.now().toString(),
      dateCreation: new Date().toISOString().split('T')[0],
      statut: 'EN_ATTENTE'
    };

    // Tente la création via l'API
    this.http.post(`${API_URL}/devis`, data).pipe(
      catchError(() => of(null))
    ).subscribe();

    this.emit([newDevis, ...this.getAll()]);
    return newDevis;
  }

  /** Modifie un devis existant */
  modifier(id: string, data: Partial<Devis>): void {
    const updated = this.getAll().map(d =>
      d.id === id ? { ...d, ...data } : d
    );

    this.http.put(`${API_URL}/devis/${id}`, data).pipe(
      catchError(() => of(null))
    ).subscribe();

    this.emit(updated);
  }

  /** Valide (accepte) un devis */
  valider(id: string): void {
    this.modifier(id, { statut: 'ACCEPTE' });
  }

  /** Refuse un devis */
  refuser(id: string): void {
    this.modifier(id, { statut: 'REFUSE' });
  }

  /** Marque un devis comme terminé */
  terminer(id: string): void {
    this.modifier(id, { statut: 'TERMINE' });
  }

  /** Supprime un devis */
  supprimer(id: string): void {
    this.http.delete(`${API_URL}/devis/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe();

    this.emit(this.getAll().filter(d => d.id !== id));
  }

  /** Calcule les statistiques */
  getStatistiques(): DevisStats {
    const all = this.getAll();
    return {
      total: all.length,
      enAttente: all.filter(d => d.statut === 'EN_ATTENTE').length,
      acceptes: all.filter(d => d.statut === 'ACCEPTE').length,
      refuses: all.filter(d => d.statut === 'REFUSE').length,
      termines: all.filter(d => d.statut === 'TERMINE').length,
      montantTotal: all.reduce((s, d) => s + d.montantEstime, 0),
      montantAccepte: all
        .filter(d => d.statut === 'ACCEPTE' || d.statut === 'TERMINE')
        .reduce((s, d) => s + d.montantEstime, 0)
    };
  }
}

