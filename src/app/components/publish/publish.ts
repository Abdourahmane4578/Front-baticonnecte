import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { JobService } from '../../services/job.service';
import { ArtisanService } from '../../services/artisan.service';
import { MetierService } from '../../services/metier.service';
import { AuthService } from '../../services/auth';
import { ProfileService } from '../../services/profile.service';

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
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './publish.html'
})
export class Publish implements OnInit {

  /** Injection du routeur pour la redirection post-publication */
  private router = inject(Router);

  /** Injection du service pour ajouter une annonce au Job Board */
  private jobService = inject(JobService);

  /** Injection du service pour ajouter un artisan à la marketplace */
  private artisanService = inject(ArtisanService);
  private metierService = inject(MetierService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  existingProfileId: string | null = null;
  isSubmittingOffre = false;
  offreError = '';

  /** Onglet actif : 'besoin' (client) ou 'offre' (artisan) */
  activeTab: 'besoin' | 'offre' = 'besoin';

  /**
   * Modèle du formulaire Client (onglet "Besoin").
   * Contient les informations nécessaires pour publier une demande de travaux.
   */
  /** CreatePostDto : titre, description (+ file). */
  besoin = {
    titre:       '',
    description: ''
  };

  /** CreateProfileDto : metierId, description (userId = compte connecté). */
  offre = {
    metierId:    '',
    description: ''
  };

  /** Liste des métiers chargés depuis le backend */
  metiers: any[] = [];

  ngOnInit(): void {
    this.metierService.list$.subscribe((m: any[]) => {
      this.metiers = m || [];
    });

    const user = this.authService.getUser();
    if (user?.id && String(user.role || '').toUpperCase().replace(/^ROLE_/, '') === 'OUVRIER') {
      this.activeTab = 'offre';
      this.profileService.getByUser(String(user.id)).subscribe((p) => {
        if (!p?.id) return;
        this.existingProfileId = p.id;
        this.offre.metierId = p.metierId ? String(p.metierId) : '';
        this.offre.description = p.description || '';
      });
    }
  }

  /**
   * Change l'onglet actif entre 'besoin' et 'offre'.
   * @param tab - L'onglet à afficher
   */
  switchTab(tab: 'besoin' | 'offre') {
    this.activeTab = tab;
  }

  /** Fichier image optionnel sélectionné par l'utilisateur */
  selectedFile: File | undefined = undefined;

  private compressImage(file: File, maxWidth: number = 1200, quality: number = 0.72): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      const img = new Image();

      reader.onload = () => {
        img.src = reader.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(file);
          return;
        }

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '') + '-compressed.jpg',
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };

      img.onerror = () => resolve(file);
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Écoute le changement du champ de sélection de fichier
   */
  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.compressImage(file).then((compressedFile) => {
        this.selectedFile = compressedFile;
      }).catch(() => {
        this.selectedFile = file;
      });
    }
  }

  getSelectedImageUrl(): string | null {
    if (!this.selectedFile) {
      return null;
    }

    return URL.createObjectURL(this.selectedFile);
  }

  /**
   * Soumet le formulaire "Besoin" (onglet client).
   * Appelle l'API POST /api/v1/posts via JobService.
   */
  publierBesoin() {
    this.jobService.createPost({
      titre:       this.besoin.titre,
      description: this.besoin.description,
      file:        this.selectedFile
    }).subscribe({
      next: () => {
        this.router.navigate(['/annonces']);
      },
      error: () => {
        this.router.navigate(['/annonces']);
      }
    });
  }

  /**
   * Soumet le formulaire "Offre" (onglet artisan).
   * Crée (ou remplace) le profil ouvrier via POST /api/v1/profiles.
   * S’il existe déjà, DELETE puis POST (pas de PATCH côté API), puis /profil/:id.
   */
  publierOffre() {
    this.offreError = '';
    const user = this.authService.getUser();
    if (!user?.id) {
      this.offreError = 'Connectez-vous pour publier une offre.';
      return;
    }
    if (String(user.role || '').toUpperCase().replace(/^ROLE_/, '') !== 'OUVRIER') {
      this.offreError = 'Seuls les comptes ouvrier peuvent publier une offre.';
      return;
    }
    if (!this.offre.metierId) {
      this.offreError = 'Choisissez un métier.';
      return;
    }
    if (!this.offre.description?.trim()) {
      this.offreError = 'Décrivez vos compétences.';
      return;
    }

    const payload = {
      userId: String(user.id),
      metierId: this.offre.metierId,
      description: this.offre.description.trim()
    };

    this.isSubmittingOffre = true;
    const create$ = this.profileService.create(payload);
    const run$ = this.existingProfileId
      ? this.profileService.delete(this.existingProfileId).pipe(
          switchMap((ok) => ok === null
            ? throwError(() => ({ status: 400, error: { message: 'Impossible de remplacer l’offre existante.' } }))
            : create$)
        )
      : create$;

    run$.subscribe({
      next: () => {
        this.isSubmittingOffre = false;
        this.artisanService.loadArtisans().subscribe();
        this.router.navigate(['/profil', user.id]);
      },
      error: (err) => {
        this.isSubmittingOffre = false;
        const status = err?.status;
        const apiMsg = err?.error?.message || err?.error;
        if (status === 409) {
          this.offreError = 'Un profil existe déjà pour ce métier. Choisissez un autre métier ou retirez l’offre actuelle.';
        } else if (status === 403) {
          this.offreError = 'Seuls les comptes ouvrier peuvent publier une offre.';
        } else if (status === 401) {
          this.offreError = 'Session expirée. Reconnectez-vous.';
        } else if (status === 404) {
          this.offreError = 'Métier ou compte introuvable.';
        } else {
          this.offreError = typeof apiMsg === 'string' && apiMsg
            ? apiMsg
            : 'Impossible de publier l’offre. Réessayez.';
        }
      }
    });
  }
}
