import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth';
import { ArtisanService } from '../../services/artisan.service';
import { initialsOf } from '../../utils/avatar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './home.html'
})
export class Home {
  private authService = inject(AuthService);
  private router = inject(Router);

  searchJob: string = '';
  searchCity: string = '';
  hasSearched: boolean = false;
  isSearching: boolean = false;
  isLoggedIn: boolean = false;

  // Liste d'artisans fournie par le service
  allOuvriers: any[] = [];
  filteredOuvriers: any[] = [];

  private artisanService = inject(ArtisanService);

  constructor() {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) {
        this.router.navigate(['/annonces']);
      }
    });

    // S'abonner au flux d'artisans (fallback inclus dans le service)
    this.artisanService.artisans$.subscribe(list => {
      this.allOuvriers = list || [];
      // Si l'utilisateur a déjà fait une recherche, met à jour les résultats
      if (this.hasSearched) this.applyFilters();
    });
  }

  initials(name?: string): string {
    return initialsOf(name);
  }

  onSearch() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSearching = true;

    setTimeout(() => {
      this.hasSearched = true;
      this.applyFilters();
      this.isSearching = false;
    }, 400);
  }

  private applyFilters() {
    const jobQ = this.searchJob.trim().toLowerCase();
    const cityQ = this.searchCity.trim().toLowerCase();

    this.filteredOuvriers = this.allOuvriers.filter(artisan => {
      const matchJob = jobQ ? `${artisan.nom || ''} ${artisan.nomComplet || ''}`.toLowerCase().includes(jobQ) : true;
      const matchCity = cityQ ? (artisan.ville || '').toString().toLowerCase().includes(cityQ) : true;
      return matchJob && matchCity;
    });
  }
}