import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class Dashboard {
  userName = 'Félix';
  isArtisan = true; // Pour la démo, on simule un compte artisan
  
  earnings = [
    { month: 'Jan', amount: 45000, height: '40%' },
    { month: 'Fev', amount: 82000, height: '70%' },
    { month: 'Mar', amount: 60000, height: '55%' },
    { month: 'Avr', amount: 95000, height: '85%' },
    { month: 'Mai', amount: 120000, height: '100%' },
    { month: 'Juin', amount: 75000, height: '65%' },
  ];

  projets = [
    { id: 1, artisan: 'Moussa Diop', service: 'Plomberie', date: '24 Oct 2023', status: 'En attente', price: '15.000 GNF' },
    { id: 2, artisan: 'Amadou Diallo', service: 'Maçonnerie', date: '12 Oct 2023', status: 'Confirmé', price: '45.000 GNF' },
    { id: 3, artisan: 'Fatou Sow', service: 'Peinture', date: '05 Oct 2023', status: 'Terminé', price: '30.000 GNF' }
  ];

  getStatusClass(status: string) {
    switch(status) {
      case 'Confirmé': return 'bg-green-50 text-green-600 border-green-100';
      case 'En attente': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Terminé': return 'bg-slate-50 text-slate-500 border-slate-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  }
}