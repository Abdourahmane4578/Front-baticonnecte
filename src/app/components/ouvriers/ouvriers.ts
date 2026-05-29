import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArtisanService } from '../../services/artisan.service';

@Component({
  selector: 'app-ouvriers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ouvriers.html'
})
export class Ouvriers implements OnInit {
  private artisanService = inject(ArtisanService);

  searchJob: string = '';
  searchCity: string = '';
  
  categories = ['Plomberie', 'Électricité', 'Menuiserie', 'Maçonnerie', 'Peinture', 'Froid & Clim'];
  villes = ['Conakry', 'Kankan', 'Labé', 'Kindia'];

  artisans: any[] = [];
  filteredArtisans: any[] = [];

  ngOnInit() {
    this.artisanService.artisans$.subscribe(data => {
      this.artisans = data;
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredArtisans = this.artisans.filter(a => {
      const matchJob = a.job.toLowerCase().includes(this.searchJob.toLowerCase());
      const matchCity = a.city.toLowerCase().includes(this.searchCity.toLowerCase());
      return matchJob && matchCity;
    });
  }
}
