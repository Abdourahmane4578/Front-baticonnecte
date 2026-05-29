import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Indispensable pour la saisie de texte

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  // Le contact avec qui on discute actuellement
  activeContact: any;

  // Liste des conversations à gauche (Sidebar)
  conversations = [
    { id: 1, name: 'Moussa Diop', lastMsg: 'En train d\'écrire...', time: '14:20', active: true, avatar: 'Moussa', status: 'En ligne' },
    { id: 2, name: 'Fatou Sow', lastMsg: 'Le devis me convient...', time: 'Hier', active: false, avatar: 'Fatou', status: 'En ligne' },
    { id: 3, name: 'Amadou Fall', lastMsg: 'À demain pour le chantier.', time: 'Lun.', active: false, avatar: 'Amadou', status: 'Hors ligne' }
  ];

  // Historique des messages (simulé pour l'exemple)
  messages = [
    { text: "Bonjour ! J'ai bien reçu votre demande pour la salle de bain.", isMe: false, time: '10:30' },
    { text: "Bonjour Moussa, super ! Vous seriez disponible quand pour le devis ?", isMe: true, time: '10:32' }
  ];

  newMessage: string = '';

  constructor() {
    // Par défaut, le premier contact est actif
    this.activeContact = this.conversations[0];
  }

  // Changer de conversation
  selectContact(contact: any) {
    this.conversations.forEach(c => c.active = false);
    contact.active = true;
    this.activeContact = contact;
  }

  // Fonction pour envoyer un message
  sendMessage() {
    if (this.newMessage.trim()) {
      this.messages.push({
        text: this.newMessage,
        isMe: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.newMessage = ''; 
    }
  }
}