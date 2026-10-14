import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ArtisanService } from '../../services/artisan.service';
import { MetierService } from '../../services/metier.service';
import { initialsOf } from '../../utils/avatar';

@Component({
  selector: 'app-ouvriers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './ouvriers.html'
})
export class Ouvriers implements OnInit {
  private artisanService = inject(ArtisanService);
  private metierService = inject(MetierService);

  searchJob: string = '';
  searchCity: string = '';
  selectedMetierId: string = '';

  metiers: any[] = [];
  artisans: any[] = [];
  filteredArtisans: any[] = [];

  ngOnInit() {
    this.metierService.list$.subscribe((list) => {
      this.metiers = Array.isArray(list) ? list : [];
    });
    this.artisanService.artisans$.subscribe(data => {
      this.artisans = Array.isArray(data) ? data : [];
      this.applyLocalFilters();
    });
    this.artisanService.loadArtisans().subscribe();
  }

  /** Relance GET /profiles avec le texte et le métier sélectionné. */
  searchOnApi() {
    const parts = [this.searchJob, this.searchCity].map(s => s.trim()).filter(Boolean);
    this.artisanService.loadArtisans({
      filter: parts.join(' ') || undefined,
      metierId: this.selectedMetierId || undefined
    }).subscribe();
  }

  applyLocalFilters() {
    this.filteredArtisans = this.artisans.filter(a => {
      const job = String(a?.nom ?? a?.job ?? '').toLowerCase();
      const city = String(a?.ville ?? a?.city ?? '').toLowerCase();
      const matchJob = job.includes(this.searchJob.trim().toLowerCase());
      const matchCity = city.includes(this.searchCity.trim().toLowerCase());
      return matchJob && matchCity;
    });
  }

  selectMetier(id: string) {
    this.selectedMetierId = this.selectedMetierId === id ? '' : id;
    this.searchOnApi();
  }

  initials(name?: string): string {
    return initialsOf(name);
  }

  resetFilters() {
    this.searchJob = '';
    this.searchCity = '';
    this.selectedMetierId = '';
    this.artisanService.loadArtisans().subscribe();
  }
}
