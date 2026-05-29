import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { ArtisanService } from '../../services/artisan.service';

@Component({
  selector: 'app-publish',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publish.html'
})
export class Publish {
  private router = inject(Router);
  private jobService = inject(JobService);
  private artisanService = inject(ArtisanService);

  activeTab: 'besoin' | 'offre' = 'besoin';

  // Formulaire Client (Besoin)
  besoin = {
    titre: '',
    metier: '',
    ville: '',
    description: '',
    budget: null as number | null,
    urgence: 'urgent'
  };

  // Formulaire Artisan (Offre)
  offre = {
    titre: '',
    metier: '',
    ville: '',
    description: '',
    tarif: null as number | null,
    disponibilite: 'immediate'
  };

  switchTab(tab: 'besoin' | 'offre') {
    this.activeTab = tab;
  }

  publierBesoin() {
    const budgetStr = this.besoin.budget ? this.besoin.budget.toString() : 'Non défini';
    let urgenceStr = 'Dès que possible';
    if (this.besoin.urgence === 'urgent') urgenceStr = 'Urgent';
    if (this.besoin.urgence === 'planifie') urgenceStr = 'Dans le mois';

    this.jobService.addAnnonce({
      titre: this.besoin.titre,
      metier: this.besoin.metier,
      ville: this.besoin.ville,
      description: this.besoin.description,
      budget: budgetStr,
      urgence: urgenceStr
    });

    setTimeout(() => {
      this.router.navigate(['/annonces']);
    }, 500);
  }

  publierOffre() {
    const tarifStr = this.offre.tarif ? this.offre.tarif.toString() : 'Sur devis';

    this.artisanService.addArtisan({
      name: 'Moi (Nouvel Artisan)', // En vrai on prendrait le nom de l'utilisateur connecté
      job: this.offre.metier,
      city: this.offre.ville,
      price: tarifStr
    });

    setTimeout(() => {
      this.router.navigate(['/ouvriers']);
    }, 500);
  }
}
