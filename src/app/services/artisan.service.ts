import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArtisanService {
  
  // Données initiales
  private initialArtisans = [
    { id: 1, name: 'Moussa Diop', job: 'Plombier Expert', city: 'Kankan', rating: 4.8, reviews: 124, price: '15.000', avatar: 'Moussa' },
    { id: 2, name: 'Fatou Sow', job: 'Électricienne', city: 'Conakry', rating: 4.9, reviews: 89, price: '20.000', avatar: 'Fatou' },
    { id: 3, name: 'Amadou Fall', job: 'Menuisier', city: 'Labé', rating: 4.7, reviews: 56, price: '12.000', avatar: 'Amadou' },
    { id: 4, name: 'Sékou Condé', job: 'Maçon', city: 'Conakry', rating: 4.6, reviews: 42, price: '18.000', avatar: 'Sekou' },
    { id: 5, name: 'Mariam Diallo', job: 'Peintre Decoratrice', city: 'Kindia', rating: 5.0, reviews: 31, price: '25.000', avatar: 'Mariam' },
    { id: 6, name: 'Ibrahima Sylla', job: 'Frigoriste', city: 'Nzérékoré', rating: 4.5, reviews: 77, price: '15.000', avatar: 'Ibrahima' },
  ];

  private artisansSubject = new BehaviorSubject<any[]>(this.initialArtisans);
  artisans$ = this.artisansSubject.asObservable();

  constructor() { }

  getArtisans() {
    return this.artisansSubject.value;
  }

  addArtisan(artisan: any) {
    const currentList = this.getArtisans();
    const newArtisan = {
      ...artisan,
      id: currentList.length + 1,
      rating: 5.0, // Nouveau profil, on lui donne 5 étoiles par défaut
      reviews: 0,
      avatar: artisan.name.split(' ')[0] // Prend le prénom pour l'avatar
    };
    
    // Ajoute le nouvel artisan au DÉBUT de la liste
    this.artisansSubject.next([newArtisan, ...currentList]);
  }
}
