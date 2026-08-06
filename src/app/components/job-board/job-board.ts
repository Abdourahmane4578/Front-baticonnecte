import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { JobService } from '../../services/job.service';

/**
 * Composant JobBoard (Tableau d'offres)
 * Affiche la liste des annonces publiées par les clients.
 * Permet aux artisans de filtrer les annonces, de liker, commenter,
 * partager et contacter les clients. Les clients peuvent modifier
 * ou supprimer leurs propres annonces.
 */
@Component({
  selector: 'app-job-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './job-board.html'
})
export class JobBoard implements OnInit {

  /** Injection du service qui gère l'état des annonces */
  private jobService = inject(JobService);

  /** Valeur de la recherche par métier ou mot-clé */
  searchMetier: string = '';

  /** Valeur de la recherche par ville */
  searchVille: string = '';

  /** Liste complète des annonces récupérées depuis le service */
  annonces: any[] = [];

  /** Liste des annonces filtrées selon les critères de recherche */
  filteredAnnonces: any[] = [];

  /**
   * Initialisation du composant.
   * S'abonne au flux d'annonces du service et applique les filtres
   * à chaque mise à jour de la liste (ajout, suppression, modification).
   */
  ngOnInit() {
    this.jobService.annonces$.subscribe(data => {
      this.annonces = data;
      this.applyFilters();
    });
  }

  /**
   * Filtre les annonces selon les critères saisis par l'utilisateur.
   * Recherche par correspondance partielle sur le métier, le titre et la ville
   * (insensible à la casse).
   */
  applyFilters() {
    this.filteredAnnonces = this.annonces.filter(a => {
      const matchMetier = a.metier.toLowerCase().includes(this.searchMetier.toLowerCase())
                       || a.titre.toLowerCase().includes(this.searchMetier.toLowerCase());
      const matchVille  = a.ville.toLowerCase().includes(this.searchVille.toLowerCase());
      return matchMetier && matchVille;
    });
  }

  /** Stocke le texte en cours de saisie pour chaque annonce (clé = id de l'annonce) */
  newComment: { [key: number]: string } = {};

  /** Contrôle l'affichage de la section commentaires pour chaque annonce (clé = id) */
  showComments: { [key: number]: boolean } = {};

  /** Contrôle l'affichage du menu déroulant (style LinkedIn) pour chaque annonce (clé = id) */
  showMenu: { [key: number]: boolean } = {};

  /** ID de l'annonce en cours de modification (null si aucune) */
  editingAnnonceId: number | null = null;

  /** Données temporaires de l'annonce en cours d'édition */
  editingAnnonceData: any = {};

  /**
   * Affiche ou masque le menu déroulant ("···") d'une annonce.
   * Ferme tous les autres menus ouverts avant d'ouvrir le menu cible.
   * @param postId - L'identifiant de l'annonce dont on bascule le menu
   */
  toggleMenu(postId: number) {
    const isOpen = this.showMenu[postId];
    // Ferme tous les menus
    this.showMenu = {};
    // Ouvre uniquement si le menu était fermé
    if (!isOpen) {
      this.showMenu[postId] = true;
    }
  }

  /**
   * Ferme tous les menus déroulants ouverts.
   * Appelé lorsque l'utilisateur clique en dehors d'un menu.
   */
  closeAllMenus() {
    this.showMenu = {};
  }

  /**
   * Active le mode édition pour une annonce donnée.
   * Ferme le menu déroulant avant d'entrer en mode édition.
   * Copie les données actuelles pour permettre l'annulation.
   * @param annonce - L'annonce à modifier
   */
  startEdit(annonce: any) {
    this.closeAllMenus();
    this.editingAnnonceId = annonce.id;
    this.editingAnnonceData = {
      titre:       annonce.titre,
      description: annonce.description,
      budget:      annonce.budget
    };
  }

  /**
   * Sauvegarde les modifications d'une annonce via le service.
   * Réinitialise le mode édition après la sauvegarde.
   */
  saveEdit() {
    if (this.editingAnnonceId) {
      this.jobService.editAnnonce(this.editingAnnonceId, this.editingAnnonceData);
      this.editingAnnonceId = null;
    }
  }

  /**
   * Annule la modification en cours sans sauvegarder les changements.
   */
  cancelEdit() {
    this.editingAnnonceId = null;
  }

  /**
   * Affiche ou masque la section des commentaires d'un post.
   * @param postId - L'identifiant du post à basculer
   */
  toggleComments(postId: number) {
    this.showComments[postId] = !this.showComments[postId];
  }

  /**
   * Pré-remplit le champ de commentaire avec une mention (@auteur)
   * pour répondre à un commentaire existant.
   * @param postId     - L'identifiant du post concerné
   * @param authorName - Le nom de l'auteur du commentaire auquel on répond
   */
  replyToComment(postId: number, authorName: string) {
    this.newComment[postId] = `@${authorName} `;
  }

  /**
   * Bascule le like sur un post (ajoute ou retire le like).
   * Délègue la logique métier au JobService.
   * @param postId - L'identifiant du post à liker/unliker
   */
  toggleLike(postId: number) {
    this.jobService.toggleLike(postId);
  }

  /**
   * Simule le partage d'une annonce en affichant une alerte.
   * À remplacer par une vraie logique de copie du lien (Clipboard API).
   * @param annonce - L'annonce à partager
   */
  sharePost(annonce: any) {
    alert(`Lien copié pour l'annonce : ${annonce.titre}`);
  }

  /**
   * Publie un nouveau commentaire sur un post.
   * Ne fait rien si le champ est vide ou contient uniquement des espaces.
   * @param postId - L'identifiant du post à commenter
   */
  addComment(postId: number) {
    if (this.newComment[postId] && this.newComment[postId].trim() !== '') {
      this.jobService.addComment(postId, 'Moi', this.newComment[postId]);
      this.newComment[postId] = ''; // Réinitialise le champ après soumission
    }
  }

  /**
   * Supprime une annonce après confirmation de l'utilisateur.
   * Ferme le menu déroulant avant d'ouvrir la boîte de confirmation.
   * @param id - L'identifiant de l'annonce à supprimer
   */
  deleteAnnonce(id: number) {
    this.closeAllMenus();
    if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      this.jobService.deleteAnnonce(id);
    }
  }
}
