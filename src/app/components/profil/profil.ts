import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profil.html'
})
export class Profil implements OnInit {
  artisanId: string | null = null;
  
  // Données de test (simulant ce qui viendra de ta base de données Spring Boot plus tard)
  artisan = {
    name: 'Moussa Diop',
    job: 'Plombier Expert',
    city: 'Conakry, Kaloum',
    rating: 4.8,
    reviews: 124,
    description: 'Expert en installation sanitaire et dépannage rapide. Plus de 10 ans d\'expérience au service des particuliers et des entreprises.',
    skills: ['Tuyauterie', 'Chauffe-eau', 'Sanitaire', 'Débouchage'],
    images: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400'
    ]
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // On récupère l'ID dans l'URL (ex: l'id 1 de /profil/1)
    this.artisanId = this.route.snapshot.paramMap.get('id');
  }
}