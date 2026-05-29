import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-job-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './job-board.html'
})
export class JobBoard implements OnInit {
  private jobService = inject(JobService);

  searchMetier: string = '';
  searchVille: string = '';

  annonces: any[] = [];
  filteredAnnonces: any[] = [];

  ngOnInit() {
    this.jobService.annonces$.subscribe(data => {
      this.annonces = data;
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredAnnonces = this.annonces.filter(a => {
      const matchMetier = a.metier.toLowerCase().includes(this.searchMetier.toLowerCase()) || a.titre.toLowerCase().includes(this.searchMetier.toLowerCase());
      const matchVille = a.ville.toLowerCase().includes(this.searchVille.toLowerCase());
      return matchMetier && matchVille;
    });
  }
}
