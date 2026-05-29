import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  
  // Initial mock data
  private initialAnnonces = [
    { id: 1, titre: 'Rénovation électrique appartement 3 pièces', metier: 'Electricien', ville: 'Conakry', description: 'Besoin de refaire toute l\'installation électrique d\'un appartement de 60m2. Matériel non fourni.', budget: '2.500.000', urgence: 'Dans le mois', date: 'Il y a 2 heures', client: 'Alpha Barry' },
    { id: 2, titre: 'Fuite d\'eau sous l\'évier', metier: 'Plombier', ville: 'Conakry', description: 'Grosse fuite d\'eau sous l\'évier de la cuisine, besoin d\'une intervention rapide.', budget: '150.000', urgence: 'Urgent', date: 'Il y a 5 heures', client: 'Fatoumata Camara' },
    { id: 3, titre: 'Peinture façade maison', metier: 'Peintre', ville: 'Kindia', description: 'Peinture extérieure pour une maison R+1. Je fournis la peinture, je cherche juste la main d\'œuvre.', budget: '1.200.000', urgence: 'Dès que possible', date: 'Hier', client: 'Oumar Diallo' },
    { id: 4, titre: 'Installation de 2 climatiseurs', metier: 'Frigoriste', ville: 'Conakry', description: 'J\'ai acheté 2 climatiseurs split, j\'ai besoin d\'un professionnel pour l\'installation.', budget: '400.000', urgence: 'Dans le mois', date: 'Hier', client: 'Mariam Sylla' }
  ];

  private annoncesSubject = new BehaviorSubject<any[]>(this.initialAnnonces);
  annonces$ = this.annoncesSubject.asObservable();

  constructor() { }

  getAnnonces() {
    return this.annoncesSubject.value;
  }

  addAnnonce(annonce: any) {
    const currentList = this.getAnnonces();
    // Create a new object with an ID and current date
    const newAnnonce = {
      ...annonce,
      id: currentList.length + 1,
      date: 'À l\'instant',
      client: 'Moi (Client)' // Simule l'utilisateur connecté
    };
    
    // Add to the top of the list
    this.annoncesSubject.next([newAnnonce, ...currentList]);
  }
}
