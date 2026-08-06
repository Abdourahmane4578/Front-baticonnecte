import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ArtisanService } from '../../services/artisan.service';

/**
 * Composant Paramètres
 * Permet à l'utilisateur de gérer son compte via trois onglets :
 * - Profil        : modification des informations personnelles
 * - Notifications : configuration des préférences de notification
 * - Sécurité      : changement de mot de passe et suppression du compte
 */
@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './parametres.html'
})
export class Parametres implements OnInit {

  /** Onglet actif ('profil' | 'notifications' | 'securite') */
  activeTab = 'profil';

  /** Injection du service artisan pour charger et mettre à jour le profil */
  private artisanService = inject(ArtisanService);

  /**
   * Données du profil utilisateur connecté.
   * Valeurs par défaut avant chargement depuis le service.
   */
  user: any = {
    id:    1,
    name:  'Moussa Diop',
    email: 'moussa.diop@example.com',
    phone: '+221 77 123 45 67',
    city:  'Dakar',
    bio:   'Artisan passionné par le travail bien fait.',
    isActive: true, // Visibilité du profil dans les listes d'artisans
    notifications: {
      email: true,  // Notifications par email
      sms:   false, // Notifications SMS
      deals: true   // Offres & bons plans
    }
  };

  /**
   * Initialisation : charge le profil de l'utilisateur connecté
   * (simulé avec l'ID 1) depuis l'ArtisanService.
   */
  ngOnInit() {
    const artisans  = this.artisanService.getArtisans();
    const myProfile = artisans.find(a => a.id === 1);

    if (myProfile) {
      this.user.name     = myProfile.name;
      this.user.city     = myProfile.city;
      // isActive vaut true par défaut si non défini dans le profil
      this.user.isActive = myProfile.isActive !== undefined ? myProfile.isActive : true;
    }
  }

  /**
   * Sauvegarde les modifications du profil via l'ArtisanService.
   * En production : remplacer alert() par une notification toast.
   */
  saveChanges() {
    this.artisanService.updateProfile(this.user.id, {
      name:     this.user.name,
      city:     this.user.city,
      isActive: this.user.isActive
    });
    alert('Vos modifications ont été enregistrées avec succès !');
  }
}
