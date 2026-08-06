import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArtisanService {
  
  // Données initiales
  private initialArtisans = [
    { id: 1, name: 'Moussa Diop', job: 'Plombier Expert', city: 'Kankan', rating: 4.8, reviews: 124, price: '15.000', avatar: 'Moussa', isActive: true },
    { id: 2, name: 'Fatou Sow', job: 'Électricienne', city: 'Conakry', rating: 4.9, reviews: 89, price: '20.000', avatar: 'Fatou', isActive: true },
    { id: 3, name: 'Amadou Fall', job: 'Menuisier', city: 'Labé', rating: 4.7, reviews: 56, price: '12.000', avatar: 'Amadou', isActive: true },
    { id: 4, name: 'Sékou Condé', job: 'Maçon', city: 'Conakry', rating: 4.6, reviews: 42, price: '18.000', avatar: 'Sekou', isActive: true },
    { id: 5, name: 'Mariam Diallo', job: 'Peintre Decoratrice', city: 'Kindia', rating: 5.0, reviews: 31, price: '25.000', avatar: 'Mariam', isActive: true },
    { id: 6, name: 'Ibrahima Sylla', job: 'Frigoriste', city: 'Nzérékoré', rating: 4.5, reviews: 77, price: '15.000', avatar: 'Ibrahima', isActive: false },
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
      avatar: artisan.name.split(' ')[0], // Prend le prénom pour l'avatar
      isActive: true
    };
    
    // Ajoute le nouvel artisan au DÉBUT de la liste
    this.artisansSubject.next([newArtisan, ...currentList]);
  }

  toggleProfileStatus(id: number) {
    const currentList = this.getArtisans();
    const updatedList = currentList.map(a => {
      if (a.id === id) {
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    this.artisansSubject.next(updatedList);
  }

  updateProfile(id: number, data: any) {
    const currentList = this.getArtisans();
    const updatedList = currentList.map(a => {
      if (a.id === id) {
        return { ...a, ...data };
      }
      return a;
    });
    this.artisansSubject.next(updatedList);
  }
}
