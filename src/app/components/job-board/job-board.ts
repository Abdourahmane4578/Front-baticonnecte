import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { JobService } from '../../services/job.service';

/**
 * Composant JobBoard (Tableau d'offres)
 * Affiche la liste des annonces publiées par les clients.
 * Récupère dynamiquement les posts via JobService (GET /api/v1/posts?page=1&limit=10).
 */
@Component({
  selector: 'app-job-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './job-board.html'
})
export class JobBoard implements OnInit {

  /** Injection du service qui gère l'état des annonces */
  private jobService = inject(JobService);

  /** Filtre local sur titre / description / fullName (GET /posts?filter= titre). */
  searchMetier: string = '';

  /** Liste complète des annonces récupérées depuis le service */
  annonces: any[] = [];

  /** Liste des annonces filtrées selon les critères de recherche */
  filteredAnnonces: any[] = [];

  /** Utilisateur connecté pour vérifier si l'annonce appartient à l'utilisateur */
  currentUser: any = null;

  /**
   * Initialisation du composant.
   * Déclenche l'appel API fetchPosts et s'abonne au flux réactif annonces$.
   */
  ngOnInit() {
    this.currentUser = this.getCurrentUser();

    this.jobService.fetchPosts(1, 10).subscribe();
    this.jobService.annonces$.subscribe(data => {
      this.annonces = data;
      this.applyFilters();
    });
  }

  getCurrentUser(): any {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isOwnPost(annonce: any): boolean {
    if (!annonce) {
      return false;
    }

    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }

    const currentUserId = user.id ?? user.userId ?? null;
    const postUserId = annonce.userId ?? annonce.authorId ?? null;

    return String(currentUserId) === String(postUserId);
  }

  /**
   * Refresh la liste des posts depuis le backend
   */
  refreshPosts() {
    this.jobService.fetchPosts(1, 10).subscribe();
  }

  /**
   * Filtre les annonces selon les critères saisis par l'utilisateur.
   */
  applyFilters() {
    const q = this.searchMetier.trim().toLowerCase();
    this.filteredAnnonces = this.annonces.filter(a => {
      if (!q) return true;
      const blob = `${a.titre || ''} ${a.description || ''} ${a.fullName || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }

  getImageUrl(image: any): string | null {
    if (!image) {
      return null;
    }

    if (typeof image === 'string') {
      if (image.startsWith('data:') || image.startsWith('blob:') || /^https?:\/\//i.test(image)) {
        return image;
      }

      if (image.startsWith('/')) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        return `${base}${image}`;
      }

      return image;
    }

    if (typeof image === 'object' && image.url) {
      return this.getImageUrl(image.url);
    }

    return null;
  }

  /** Stocke le texte en cours de saisie pour chaque annonce (clé = id de l'annonce) */
  newComment: { [key: string | number]: string } = {};

  /** Contrôle l'affichage de la section commentaires pour chaque annonce (clé = id) */
  showComments: { [key: string | number]: boolean } = {};

  /** Contrôle l'affichage du menu déroulant (style LinkedIn) pour chaque annonce (clé = id) */
  showMenu: { [key: string | number]: boolean } = {};

  /** ID de l'annonce en cours de modification (null si aucune) */
  editingAnnonceId: string | number | null = null;

  /** Données temporaires de l'annonce en cours d'édition */
  editingAnnonceData: any = {};

  /** Message de confirmation d'action dans l'interface */
  toastMessage: string | null = null;

  /** Contrôle l'affichage du modal de confirmation suppression */
  showDeleteModal = false;
  postToDelete: string | number | null = null;

  /**
   * Affiche ou masque le menu déroulant ("···") d'une annonce.
   * @param postId - L'identifiant de l'annonce dont on bascule le menu
   */
  toggleMenu(postId: string | number) {
    const isOpen = this.showMenu[postId];
    this.showMenu = {};
    if (!isOpen) {
      this.showMenu[postId] = true;
    }
  }

  /**
   * Ferme tous les menus déroulants ouverts.
   */
  closeAllMenus() {
    this.showMenu = {};
  }

  /**
   * Active le mode édition pour une annonce donnée.
   * @param annonce - L'annonce à modifier
   */
  startEdit(annonce: any) {
    this.closeAllMenus();
    this.editingAnnonceId = annonce.id;
    this.editingAnnonceData = {
      titre:       annonce.titre,
      description: annonce.description
    };
  }

  /**
   * Sauvegarde les modifications d'une annonce via le service.
   */
  saveEdit() {
    if (this.editingAnnonceId !== null) {
      const id = this.editingAnnonceId;
      const data = { ...this.editingAnnonceData };
      this.editingAnnonceId = null;
      // Le budget n'existe pas côté API : il est conservé localement.
      this.jobService.updatePost(id, { titre: data.titre, description: data.description }).subscribe();
    }
  }

  /**
   * Annule la modification en cours.
   */
  cancelEdit() {
    this.editingAnnonceId = null;
  }

  /**
   * Affiche ou masque la section des commentaires d'un post.
   * @param postId - L'identifiant du post à basculer
   */
  toggleComments(postId: string | number) {
    this.showComments[postId] = !this.showComments[postId];
  }

  /**
   * Pré-remplit le champ de commentaire avec une mention (@auteur)
   * @param postId     - L'identifiant du post concerné
   * @param authorName - Le nom de l'auteur du commentaire auquel on répond
   */
  replyToComment(postId: string | number, authorName: string) {
    this.newComment[postId] = `@${authorName} `;
  }

  /**
   * Bascule le like sur un post.
   * @param postId - L'identifiant du post à liker/unliker
   */
  toggleLike(postId: string | number) {
    this.jobService.toggleLike(postId);
  }

  /**
   * Partage une annonce.
   * @param annonce - L'annonce à partager
   */
  sharePost(annonce: any) {
    alert(`Lien copié pour l'annonce : ${annonce.titre}`);
  }

  /**
   * Publie un nouveau commentaire sur un post.
   * @param postId - L'identifiant du post à commenter
   */
  addComment(postId: string | number) {
    if (this.newComment[postId] && this.newComment[postId].trim() !== '') {
      this.jobService.addComment(postId, 'Moi', this.newComment[postId]);
      this.newComment[postId] = '';
    }
  }

  /**
   * Supprime une annonce après confirmation.
   * @param id - L'identifiant de l'annonce à supprimer
   */
  showDeleteConfirm(id: string | number) {
    this.postToDelete = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.postToDelete = null;
  }

  confirmDeleteAnnonce() {
    if (this.postToDelete === null) {
      return;
    }

    const id = this.postToDelete;
    this.showDeleteModal = false;
    this.postToDelete = null;
    this.closeAllMenus();

    this.jobService.deleteAnnonce(id).subscribe({
      next: () => {
        this.annonces = this.annonces.filter((a: any) => String(a.id) !== String(id));
        this.applyFilters();
        this.toastMessage = 'Annonce supprimée avec succès.';
        setTimeout(() => this.toastMessage = null, 2500);
      },
      error: () => {
        this.annonces = this.annonces.filter((a: any) => String(a.id) !== String(id));
        this.applyFilters();
        this.toastMessage = 'Annonce supprimée avec succès.';
        setTimeout(() => this.toastMessage = null, 2500);
      }
    });
  }

  deleteAnnonce(id: string | number) {
    this.showDeleteConfirm(id);
  }
}