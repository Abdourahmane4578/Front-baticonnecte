import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html'
})
export class Home {
  private authService = inject(AuthService);
  private router = inject(Router);

  searchJob: string = '';
  searchCity: string = '';
  hasSearched: boolean = false;
  isLoggedIn: boolean = false;

  constructor() {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  // Liste de test
  allOuvriers = [
    { id: 1, name: 'Moussa Diop', job: 'Plombier', city: 'Conakry', rating: 4.9 },
    { id: 2, name: 'Amadou Diallo', job: 'Maçon', city: 'Kindia', rating: 4.7 },
    { id: 3, name: 'Fatou Sow', job: 'Peintre', city: 'Labé', rating: 4.8 },
    { id: 4, name: 'Jean Camara', job: 'Electricien', city: 'Kankan', rating: 4.5 }
  ];

  filteredOuvriers: any[] = [];

  onSearch() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.hasSearched = true;
    this.filteredOuvriers = this.allOuvriers.filter(artisan => {
      const matchJob = artisan.job.toLowerCase().includes(this.searchJob.toLowerCase());
      const matchCity = artisan.city.toLowerCase().includes(this.searchCity.toLowerCase());
      return matchJob && matchCity;
    });
  }
}