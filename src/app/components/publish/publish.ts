import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { ArtisanService } from '../../services/artisan.service';

/**
 * Composant Publish (Publication)
 * Formulaire de publication à deux onglets :
 * - "Besoin" (onglet client)  : publier une annonce de recherche d'artisan
 * - "Offre"  (onglet artisan) : publier une offre de service sur la marketplace
 *
 * Après soumission, l'utilisateur est redirigé vers la liste correspondante.
 */
@Component({
  selector: 'app-publish',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publish.html'
})
export class Publish {

  /** Injection du routeur pour la redirection post-publication */
  private router = inject(Router);

  /** Injection du service pour ajouter une annonce au Job Board */
  private jobService = inject(JobService);

  /** Injection du service pour ajouter un artisan à la marketplace */
  private artisanService = inject(ArtisanService);

  /** Onglet actif : 'besoin' (client) ou 'offre' (artisan) */
  activeTab: 'besoin' | 'offre' = 'besoin';

  /**
   * Modèle du formulaire Client (onglet "Besoin").
   * Contient les informations nécessaires pour publier une demande de travaux.
   */
  besoin = {
    titre:       '',
    metier:      '',
    ville:       '',
    description: '',
    budget:      null as number | null,
    urgence:     'urgent'   // Valeur par défaut : urgent
  };

  /**
   * Modèle du formulaire Artisan (onglet "Offre").
   * Contient les informations nécessaires pour publier une offre de service.
   */
  offre = {
    titre:          '',
    metier:         '',
    ville:          '',
    description:    '',
    tarif:          null as number | null,
    disponibilite:  'immediate'   // Valeur par défaut : disponibilité immédiate
  };

  /**
   * Change l'onglet actif entre 'besoin' et 'offre'.
   * @param tab - L'onglet à afficher
   */
  switchTab(tab: 'besoin' | 'offre') {
    this.activeTab = tab;
  }

  /**
   * Soumet le formulaire "Besoin" (onglet client).
   * Convertit les valeurs du formulaire (budget, urgence) en chaînes
   * lisibles, puis ajoute l'annonce au Job Board via le JobService.
   * Redirige vers /annonces après 500ms (pour laisser le temps à l'UI de se mettre à jour).
   */
  publierBesoin() {
    // Conversion du budget en chaîne (affichage "Non défini" si vide)
    const budgetStr = this.besoin.budget ? this.besoin.budget.toString() : 'Non défini';

    // Conversion du code d'urgence en libellé lisible
    let urgenceStr = 'Dès que possible';
    if (this.besoin.urgence === 'urgent')   urgenceStr = 'Urgent';
    if (this.besoin.urgence === 'planifie') urgenceStr = 'Dans le mois';

    this.jobService.addAnnonce({
      titre:       this.besoin.titre,
      metier:      this.besoin.metier,
      ville:       this.besoin.ville,
      description: this.besoin.description,
      budget:      budgetStr,
      urgence:     urgenceStr
    });

    // Redirection légèrement différée pour une meilleure UX
    setTimeout(() => {
      this.router.navigate(['/annonces']);
    }, 500);
  }

  /**
   * Soumet le formulaire "Offre" (onglet artisan).
   * Convertit le tarif en chaîne ("À discuter" si non renseigné),
   * puis ajoute l'artisan à la liste via l'ArtisanService.
   * Redirige vers /ouvriers après 500ms.
   *
   * TODO : remplacer 'Moi (Nouvel Artisan)' par le vrai nom
   *        de l'utilisateur connecté (depuis AuthService).
   */
  publierOffre() {
    // Conversion du tarif en chaîne (affichage "À discuter" si vide)
    const tarifStr = this.offre.tarif ? this.offre.tarif.toString() : 'À discuter';

    this.artisanService.addArtisan({
      name:  'Moi (Nouvel Artisan)', // À remplacer par le nom de l'utilisateur connecté
      job:   this.offre.metier,
      city:  this.offre.ville,
      price: tarifStr
    });

    // Redirection légèrement différée pour une meilleure UX
    setTimeout(() => {
      this.router.navigate(['/ouvriers']);
    }, 500);
  }
}
