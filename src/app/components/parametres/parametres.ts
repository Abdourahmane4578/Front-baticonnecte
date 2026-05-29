import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './parametres.html'
})
export class Parametres {
  activeTab = 'profil';
  
  user = {
    name: 'Moussa Diop',
    email: 'moussa.diop@example.com',
    phone: '+221 77 123 45 67',
    city: 'Dakar',
    bio: 'Artisan passionné par le travail bien fait.',
    notifications: {
      email: true,
      sms: false,
      deals: true
    }
  };

  saveChanges() {
    alert('Vos modifications ont été enregistrées avec succès !');
  }
}
