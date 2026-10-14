import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth';
import { DevisService } from '../../services/devis.service';
import { ProfileService, OuvrierProfile } from '../../services/profile.service';
import { ArtisanService } from '../../services/artisan.service';
import { initialsOf } from '../../utils/avatar';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './profil.html'
})
export class Profil implements OnInit {
  artisanId: string | null = null;
  currentUser: any = null;
  loading = true;
  hasOuvrierProfile = false;
  profileId: string | null = null;

  artisan: any = {
    nomComplet: 'Chargement...',
    nom: '',
    ville: '',
    email: '',
    adresse: '',
    description: '',
    metierId: null,
    imageUrl: ''
  };

  initials(name?: string): string {
    return initialsOf(name);
  }

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
    private router: Router,
    private authService: AuthService,
    private devisService: DevisService,
    private profileService: ProfileService,
    private artisanService: ArtisanService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.route.paramMap.subscribe((params) => {
      this.artisanId = params.get('id');
      this.load(this.artisanId);
    });
  }

  get isOuvrier(): boolean {
    return String(this.currentUser?.role || '').toUpperCase().replace(/^ROLE_/, '') === 'OUVRIER';
  }

  get isOwnProfile(): boolean {
    const me = this.currentUser?.id;
    return !!this.artisanId && !!me && String(this.artisanId) === String(me);
  }

  get canMessage(): boolean {
    return !!this.artisanId && !this.isOwnProfile;
  }

  get canAskDevis(): boolean {
    return !this.isOwnProfile;
  }

  private load(userId: string | null): void {
    this.loading = true;
    this.hasOuvrierProfile = false;
    this.profileId = null;
    if (!userId) {
      this.applyUserFallback(this.currentUser);
      this.loading = false;
      return;
    }

    this.profileService.getByUser(userId).subscribe((profile) => {
      if (profile?.userId || profile?.nomComplet || profile?.id) {
        this.applyApiProfile(profile);
        this.loading = false;
        return;
      }
      this.applyListOrUserFallback(userId);
    });
  }

  private applyApiProfile(profile: OuvrierProfile): void {
    this.hasOuvrierProfile = true;
    this.profileId = profile.id || null;
    this.artisan = {
      nomComplet: profile.nomComplet || 'Artisan',
      email: profile.email || '',
      nom: profile.nom || '',
      ville: profile.ville || '',
      adresse: profile.adresse || '',
      description: profile.description || '',
      metierId: profile.metierId || null,
      imageUrl: (profile as any).imageUrl || this.ownImageUrl()
    };
  }

  private applyListOrUserFallback(userId: string): void {
    const fromList = this.artisanService.getArtisans().find((a) => String(a.id) === String(userId));
    if (fromList) {
      this.hasOuvrierProfile = !!fromList.profileId;
      this.profileId = fromList.profileId || null;
      this.artisan = {
        nomComplet: fromList.nomComplet || fromList.name,
        email: fromList.email || '',
        nom: fromList.nom || fromList.job || '',
        ville: fromList.ville || fromList.city || '',
        adresse: fromList.adresse || '',
        description: fromList.description || '',
        metierId: fromList.metierId || null,
        imageUrl: fromList.imageUrl || this.ownImageUrl()
      };
      this.loading = false;
      return;
    }

    if (this.isOwnProfile) {
      this.applyUserFallback(this.currentUser);
      this.loading = false;
      return;
    }

    this.artisanService.loadArtisans().subscribe(() => {
      const again = this.artisanService.getArtisans().find((a) => String(a.id) === String(userId));
      if (again) {
        this.applyListOrUserFallback(userId);
        return;
      }
      this.artisan = {
        nomComplet: 'Profil introuvable',
        nom: '',
        ville: '',
        email: '',
        adresse: '',
        description: 'Cet utilisateur n’a pas encore de profil public.',
        metierId: null,
        imageUrl: ''
      };
      this.loading = false;
    });
  }

  private applyUserFallback(user: any): void {
    if (!user) {
      this.artisan.nomComplet = 'Visiteur';
      return;
    }
    this.artisan = {
      nomComplet: user.nomComplet || user.username || 'Utilisateur',
      email: user.email || '',
      nom: user.role || '',
      ville: user.ville || '',
      adresse: user.adresse || '',
      description: '',
      metierId: null,
      imageUrl: user.imageUrl || ''
    };
  }

  private ownImageUrl(): string {
    return this.isOwnProfile ? (this.currentUser?.imageUrl || '') : '';
  }

  retirerOffre(): void {
    if (!this.profileId) return;
    if (!confirm('Retirer votre offre ? Vous disparaîtrez de l’annuaire des ouvriers.')) return;
    this.profileService.delete(this.profileId).subscribe((msg) => {
      if (msg === null) return;
      this.artisanService.loadArtisans().subscribe();
      this.load(this.artisanId);
    });
  }

  envoyerMessage(): void {
    if (!this.canMessage) return;
    this.router.navigate(['/messages'], { queryParams: { with: this.artisanId } });
  }

  scrollToDevis(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('sidebar-devis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

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
    this.devisService.creer({
      titre: this.devisForm.titre,
      description: this.devisForm.description,
      clientNom: this.currentUser?.nomComplet || this.currentUser?.username || 'Client',
      clientEmail: this.currentUser?.email || '',
      artisanNom: this.artisan.nomComplet,
      metier: this.artisan.nom,
      montantEstime: this.devisForm.montantEstime || 0,
      adresseTravaux: this.devisForm.adresseTravaux,
      dateSouhaitee: this.devisForm.dateSouhaitee,
      authorId: this.currentUser?.id || '0',
      notes: ''
    });
    this.devisSent = true;
    this.devisForm = { titre: '', description: '', adresseTravaux: '', dateSouhaitee: '', montantEstime: 0 };
  }
}
