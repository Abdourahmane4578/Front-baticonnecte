import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DevisService, Devis, DevisStats } from '../../services/devis.service';

/**
 * Composant Devis
 * Affiche la liste des devis avec filtres, statistiques, et formulaire de création/modification.
 */
@Component({
  selector: 'app-devis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './devis.html'
})
export class DevisComponent implements OnInit, OnDestroy {

  // ─── État principal ──────────────────────────────────────────────────────────
  devis: Devis[] = [];
  filteredDevis: Devis[] = [];
  stats: DevisStats = { total: 0, enAttente: 0, acceptes: 0, refuses: 0, termines: 0, montantTotal: 0, montantAccepte: 0 };

  // ─── Filtres ─────────────────────────────────────────────────────────────────
  filtreStatut: string = 'TOUS';
  filtreRecherche: string = '';

  // ─── Modal Création / Modification ───────────────────────────────────────────
  showModal = false;
  isEditing = false;
  editingId: string | null = null;

  form: Partial<Devis> = this.emptyForm();

  private sub!: Subscription;

  constructor(private devisService: DevisService) {}

  ngOnInit(): void {
    this.sub = this.devisService.devis$.subscribe(list => {
      this.devis = list;
      this.appliquerFiltres();
      this.stats = this.devisService.getStatistiques();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Filtrage ─────────────────────────────────────────────────────────────────

  appliquerFiltres(): void {
    this.filteredDevis = this.devis.filter(d => {
      const matchStatut = this.filtreStatut === 'TOUS' || d.statut === this.filtreStatut;
      const q = this.filtreRecherche.toLowerCase();
      const matchSearch = !q ||
        d.titre.toLowerCase().includes(q) ||
        d.clientNom.toLowerCase().includes(q) ||
        d.metier.toLowerCase().includes(q);
      return matchStatut && matchSearch;
    });
  }

  setFiltre(statut: string): void {
    this.filtreStatut = statut;
    this.appliquerFiltres();
  }

  onSearch(): void {
    this.appliquerFiltres();
  }

  // ─── Modal ────────────────────────────────────────────────────────────────────

  ouvrirCreation(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  ouvrirModification(d: Devis): void {
    this.isEditing = true;
    this.editingId = d.id;
    this.form = { ...d };
    this.showModal = true;
  }

  fermerModal(): void {
    this.showModal = false;
  }

  sauvegarder(): void {
    if (!this.form.titre || !this.form.clientNom || !this.form.montantEstime) return;

    if (this.isEditing && this.editingId) {
      this.devisService.modifier(this.editingId, this.form);
    } else {
      this.devisService.creer(this.form as Omit<Devis, 'id' | 'dateCreation' | 'statut'>);
    }
    this.fermerModal();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  valider(id: string): void {
    this.devisService.valider(id);
  }

  refuser(id: string): void {
    this.devisService.refuser(id);
  }

  terminer(id: string): void {
    this.devisService.terminer(id);
  }

  supprimer(id: string): void {
    if (confirm('Supprimer ce devis définitivement ?')) {
      this.devisService.supprimer(id);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  emptyForm(): Partial<Devis> {
    return {
      titre: '',
      description: '',
      clientNom: '',
      clientEmail: '',
      artisanNom: '',
      metier: '',
      montantEstime: 0,
      adresseTravaux: '',
      dateSouhaitee: '',
      notes: ''
    };
  }

  formatMontant(n: number): string {
    return n.toLocaleString('fr-FR') + ' GNF';
  }

  statutLabel(s: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      ACCEPTE: 'Accepté',
      REFUSE: 'Refusé',
      TERMINE: 'Terminé'
    };
    return labels[s] || s;
  }

  statutClass(s: string): string {
    const classes: Record<string, string> = {
      EN_ATTENTE: 'bg-amber-100 text-amber-700 border border-amber-200',
      ACCEPTE:    'bg-green-100 text-green-700 border border-green-200',
      REFUSE:     'bg-red-100 text-red-700 border border-red-200',
      TERMINE:    'bg-blue-100 text-blue-700 border border-blue-200'
    };
    return classes[s] || '';
  }
}
