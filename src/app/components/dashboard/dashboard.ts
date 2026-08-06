import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Composant Dashboard
 * Affiche le tableau de bord principal de l'utilisateur connecté.
 * Il présente un résumé des projets en cours, les dépenses totales
 * et les artisans favoris, ainsi qu'un tableau des projets récents.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class Dashboard {

  /** Nom de l'utilisateur connecté (à connecter au service d'auth) */
  userName = 'Félix';

  /** Indique si l'utilisateur est un artisan (true) ou un client (false) */
  isArtisan = true; // Pour la démo, on simule un compte artisan

  /**
   * Liste des projets récents de l'utilisateur.
   * Chaque projet contient : id, artisan, service, date, statut et prix.
   * À remplacer par un appel API en production.
   */
  projets = [
    { id: 1, artisan: 'Moussa Diop',   service: 'Plomberie',  date: '24 Oct 2023', status: 'En attente', price: '15.000 GNF' },
    { id: 2, artisan: 'Amadou Diallo', service: 'Maçonnerie', date: '12 Oct 2023', status: 'Confirmé',   price: '45.000 GNF' },
    { id: 3, artisan: 'Fatou Sow',     service: 'Peinture',   date: '05 Oct 2023', status: 'Terminé',    price: '30.000 GNF' }
  ];

  /**
   * Retourne les classes CSS Tailwind correspondant au statut d'un projet.
   * Utilisé pour coloriser dynamiquement le badge de statut dans le tableau.
   * @param status - Le statut du projet ('Confirmé', 'En attente', 'Terminé', etc.)
   * @returns Une chaîne de classes CSS pour la couleur du badge
   */
  getStatusClass(status: string) {
    switch (status) {
      case 'Confirmé':   return 'bg-green-50 text-green-600 border-green-100';
      case 'En attente': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Terminé':    return 'bg-slate-50 text-slate-500 border-slate-100';
      default:           return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  }
}