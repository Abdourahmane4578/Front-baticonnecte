import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profil.html'
})
export class Profil implements OnInit {
  artisanId: string | null = null;
  currentUser: any = null;
  
  artisan: any = {
    name: 'Chargement...',
    job: '',
    city: '',
    rating: 0,
    reviews: 0,
    description: '',
    skills: [],
    images: []
  };

  constructor(private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit() {
    // On récupère l'ID dans l'URL (ex: l'id 1 de /profil/1)
    this.artisanId = this.route.snapshot.paramMap.get('id');

    // Récupérer les informations de l'utilisateur connecté
    this.currentUser = this.authService.getUser();
    
    if (this.currentUser) {
      this.artisan = {
        name: this.currentUser.username || 'Utilisateur',
        job: this.currentUser.role === 'ARTISAN' ? 'Artisan' : (this.currentUser.role || 'Client'),
        city: 'Non renseigné',
        rating: 0,
        reviews: 0,
        description: 'Bienvenue sur votre profil BatiConnect. Vous pourrez bientôt compléter vos informations.',
        skills: [],
        images: []
      };
    } else {
      this.artisan.name = 'Visiteur';
    }
  }
}