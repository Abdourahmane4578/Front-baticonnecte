import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ArtisanService } from '../../services/artisan.service';
import { AuthService } from '../../services/auth';
import { MetierService } from '../../services/metier.service';
import { ThemeService } from '../../services/theme.service';
import { ProfileService } from '../../services/profile.service';
import { UserService } from '../../services/user.service';
import { initialsOf } from '../../utils/avatar';

/**
 * Composant Paramètres
 * Permet à l'utilisateur de gérer son compte via trois onglets :
 * - Profil        : modification des informations personnelles
 * - Notifications : configuration des préférences de notification
 * - Sécurité      : changement de mot de passe et suppression du compte
 */
@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './parametres.html'
})
export class Parametres implements OnInit {

  /** Onglet actif ('profil' | 'notifications' | 'securite' | 'metiers') */
  activeTab = 'profil';

  /** Injection des services */
  private artisanService = inject(ArtisanService);
  private authService = inject(AuthService);
  private metierService = inject(MetierService);
  private router = inject(Router);
  /** Thème clair / sombre (préférence d'affichage) */
  theme = inject(ThemeService);
  private profileService = inject(ProfileService);
  private userService = inject(UserService);
  isOuvrier = false;
  ouvrierMetier = '';
  ouvrierProfileId: string | null = null;
  isRemovingOffre = false;

  initials(name?: string): string {
    return initialsOf(name);
  }

  /**
   * Données du profil.
   */
  user: any = {
    id: null,
    nomComplet: '',
    email: '',
    adresse: '',
    ville: '',
    role: '',
    statut: '',
    imageUrl: '',
    notifications: {
      email: true,
      sms:   false,
      deals: true
    }
  };

  metierForm = {
    nom: '',
    description: '',
    statut: 'ACTIF'
  };

  metiers: any[] = [];
  deletingMetierId: number | string | null = null;
  showDeleteModal = false;
  editingMetierId: number | string | null = null;
  isSubmittingMetier = false;
  isDeletingMetier = false;

  /**
   * Initialisation : charge le profil de l'utilisateur connecté
   */
  ngOnInit() {
    const currentUser = this.authService.getUser();

    if (currentUser) {
      this.user.id = currentUser.id;
      this.user.nomComplet = currentUser.nomComplet || currentUser.username || '';
      this.user.email = currentUser.email || '';
      this.user.adresse = currentUser.adresse || '';
      this.user.ville = currentUser.ville || '';
      this.user.role = currentUser.role || '';
      this.user.statut = currentUser.statut || '';
      this.user.imageUrl = currentUser.imageUrl || '';
      this.isOuvrier = String(currentUser.role || '').toUpperCase().replace(/^ROLE_/, '') === 'OUVRIER';

      if (currentUser.id && this.isOuvrier) {
        this.profileService.getByUser(String(currentUser.id)).subscribe((p) => {
          if (!p) return;
          this.ouvrierMetier = p.nom || '';
          this.ouvrierProfileId = p.id || null;
          if (p.ville) this.user.ville = p.ville;
          if (p.adresse) this.user.adresse = p.adresse;
        });
      }
    }

    this.refreshMetiers();

    this.metierService.list$.subscribe((items: any[]) => {
      this.metiers = items || [];
    });
  }

  refreshMetiers() {
    this.metierService.loadAll().subscribe({
      next: () => console.log('Liste métiers rafraîchie'),
      error: (err) => console.error('Erreur lors du refresh des métiers', err)
    });
  }

  /**
   * Sauvegarde les modifications du profil via l'ArtisanService.
   * En production : remplacer alert() par une notification toast.
   */
  saveChanges() {
    alert('Le compte utilisateur n’a pas d’endpoint de modification (hors photo). Utilisez « Publier » pour l’offre ouvrier.');
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.user.id) return;
    this.userService.uploadProfileImage(this.user.id, file).subscribe((res: any) => {
      const imageUrl = res?.imageUrl || res?.data?.imageUrl;
      if (imageUrl) {
        this.user.imageUrl = imageUrl;
        const stored = this.authService.getUser() || {};
        localStorage.setItem('user', JSON.stringify({ ...stored, imageUrl }));
      }
    });
  }

  retirerOffre() {
    if (!this.ouvrierProfileId || this.isRemovingOffre) return;
    if (!confirm('Retirer votre offre ? Vous disparaîtrez de l’annuaire des ouvriers.')) return;

    this.isRemovingOffre = true;
    this.profileService.delete(this.ouvrierProfileId).subscribe({
      next: (msg) => {
        this.isRemovingOffre = false;
        if (msg === null) {
          alert('Impossible de retirer l’offre. Réessayez.');
          return;
        }
        this.ouvrierProfileId = null;
        this.ouvrierMetier = '';
        this.artisanService.loadArtisans().subscribe();
      },
      error: () => {
        this.isRemovingOffre = false;
        alert('Impossible de retirer l’offre. Réessayez.');
      }
    });
  }

  submitMetierForm() {
    const nom = (this.metierForm.nom || '').trim();
    const description = (this.metierForm.description || '').trim();

    if (!nom) {
      alert('Le nom du métier est obligatoire.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Tu dois être connecté pour créer ou modifier un métier.');
      return;
    }

    const payload = {
      nom,
      description,
      statut: this.metierForm.statut || 'ACTIF'
    };

    this.isSubmittingMetier = true;

    const complete = () => {
      this.isSubmittingMetier = false;
    };

    if (this.editingMetierId !== null && this.editingMetierId !== undefined) {
      this.metierService.update(this.editingMetierId, payload).subscribe({
        next: (res: any) => {
          console.log('Réponse modification métier :', res);
          if (res !== null && res !== undefined) {
            this.resetMetierForm();
            this.refreshMetiers();
            alert('Métier modifié avec succès.');
          } else {
            alert('La modification a échoué. Vérifie ton accès admin.');
          }
        },
        error: () => {
          alert('Erreur lors de la modification du métier.');
        },
        complete
      });
      return;
    }

    this.metierService.create(payload).subscribe({
      next: (res: any) => {
        console.log('Réponse création métier :', res);
        if (res) {
          this.resetMetierForm();
          this.refreshMetiers();
          alert('Métier créé avec succès.');
        } else {
          alert('Erreur lors de la création du métier. Vérifie ton token ou reconnecte-toi.');
        }
      },
      error: () => {
        alert('Erreur lors de la création du métier.');
      },
      complete
    });
  }

  resetMetierForm() {
    this.metierForm = { nom: '', description: '', statut: 'ACTIF' };
    this.editingMetierId = null;
  }

  editMetier(metier: any) {
    this.editingMetierId = metier.id ?? null;
    this.metierForm = {
      nom: metier.nom || metier.name || metier.label || '',
      description: metier.description || '',
      statut: metier.statut || metier.status || 'ACTIF'
    };
  }

  openDeleteModal(id: number | string) {
    this.deletingMetierId = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deletingMetierId = null;
  }

  confirmDeleteMetier() {
    if (this.deletingMetierId === null || this.deletingMetierId === undefined) {
      return;
    }

    const id = this.deletingMetierId;
    this.showDeleteModal = false;
    this.isDeletingMetier = true;

    this.metierService.delete(id).subscribe({
      next: (res: any) => {
        console.log('Réponse suppression métier :', res);

        if (res !== null && res !== undefined) {
          this.refreshMetiers();
          alert('Métier supprimé avec succès.');
        } else {
          alert('La suppression a échoué. Vérifie ton accès admin.');
        }
      },
      error: () => {
        alert('Erreur lors de la suppression du métier.');
      },
      complete: () => {
        this.isDeletingMetier = false;
        this.deletingMetierId = null;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
