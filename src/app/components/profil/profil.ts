import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DevisService } from '../../services/devis.service';

/**
 * Composant Profil Artisan
 * Affiche les informations de l'artisan et intègre un formulaire de demande de devis.
 */
@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profil.html'
})
export class Profil implements OnInit {

  artisanId: string | null = null;
  currentUser: any = null;

  artisan: any = {
    name: 'Chargement...',
    job: '',
    city: '',
    email: '',
    adresse: '',
    rating: 0,
    reviews: 0,
    description: '',
    skills: [],
    images: []
  };

  // ─── Formulaire de demande de devis ──────────────────────────────────────────
  devisForm = {
    titre: '',
    description: '',
    adresseTravaux: '',
    dateSouhaitee: '',
    montantEstime: 0
  };
  devisSent = false;
  devisError = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private devisService: DevisService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.artisanId = this.route.snapshot.paramMap.get('id');
    this.currentUser = this.authService.getUser();

    if (this.currentUser) {
      const roleLabel = this.currentUser.role === 'OUVRIER'
        ? 'Ouvrier / Artisan'
        : this.currentUser.role === 'CLIENT'
        ? 'Client'
        : this.currentUser.role === 'ADMIN'
        ? 'Administrateur'
        : (this.currentUser.role || 'Membre');

      this.artisan = {
        name: this.currentUser.username || 'Utilisateur',
        email: this.currentUser.email || '',
        job: roleLabel,
        city: this.currentUser.ville || 'Non renseigné',
        adresse: this.currentUser.adresse || '',
        rating: 0,
        reviews: 0,
        description: `Bienvenue sur le profil de ${this.currentUser.username || 'cet utilisateur'} sur BatiConnect.`,
        skills: [],
        images: []
      };
    } else {
      this.artisan.name = 'Visiteur';
    }
  }

  /**
   * Fait défiler la page jusqu'au formulaire de devis (sidebar).
   */
  scrollToDevis(): void {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById('sidebar-devis');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /**
   * Valide et soumet le formulaire de demande de devis.
   * Le devis est créé dans le DevisService avec les infos de l'artisan et du client.
   */
  envoyerDevis(): void {
    this.devisError = '';

    if (!this.devisForm.titre.trim()) {
      this.devisError = "Veuillez saisir l'objet des travaux.";
      return;
    }
    if (!this.devisForm.description.trim()) {
      this.devisError = 'Veuillez décrire vos travaux.';
      return;
    }

    // Crée le devis avec les infos du client connecté et de l'artisan visité
    this.devisService.creer({
      titre: this.devisForm.titre,
      description: this.devisForm.description,
      clientNom: this.currentUser?.username || 'Client',
      clientEmail: this.currentUser?.email || '',
      artisanNom: this.artisan.name,
      metier: this.artisan.job,
      montantEstime: this.devisForm.montantEstime || 0,
      adresseTravaux: this.devisForm.adresseTravaux,
      dateSouhaitee: this.devisForm.dateSouhaitee,
      authorId: this.currentUser?.id || '0',
      notes: ''
    });

    // Affiche la confirmation et réinitialise le formulaire
    this.devisSent = true;
    this.devisForm = { titre: '', description: '', adresseTravaux: '', dateSouhaitee: '', montantEstime: 0 };
  }
}