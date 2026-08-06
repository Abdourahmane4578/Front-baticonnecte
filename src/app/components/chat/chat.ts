import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService, Message } from '../../services/chat.service';

/**
 * Composant Chat
 * Interface de messagerie instantanée entre utilisateurs (clients / artisans).
 * Affiche la liste des conversations à gauche et les messages de la conversation
 * active à droite. Supporte l'envoi, la modification, la suppression et la
 * réponse à des messages.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {

  /** Injection du service de messagerie */
  private chatService = inject(ChatService);

  /** Contact actuellement sélectionné dans la liste des conversations */
  activeContact: any;

  /**
   * Liste des conversations disponibles.
   * Chaque entrée représente un contact avec son dernier message et son statut.
   * À remplacer par un appel API pour charger les vraies conversations de l'utilisateur.
   */
  conversations = [
    { id: 1, name: 'Moussa Diop',  lastMsg: 'En train d\'écrire...',        time: '14:20', active: true,  avatar: 'Moussa', status: 'En ligne'  },
    { id: 2, name: 'Fatou Sow',    lastMsg: 'Le tarif me convient...',       time: 'Hier',  active: false, avatar: 'Fatou',  status: 'En ligne'  },
    { id: 3, name: 'Amadou Fall',  lastMsg: 'À demain pour le chantier.',    time: 'Lun.',  active: false, avatar: 'Amadou', status: 'Hors ligne' }
  ];

  /** Liste des messages de la conversation active */
  messages: Message[] = [];

  /** Contenu du champ de saisie du nouveau message */
  newMessage: string = '';

  /** ID du message en cours de modification (null si aucun) */
  editingMessageId: number | null = null;

  /** Texte temporaire pour l'édition d'un message existant */
  editingMessageText: string = '';

  /** Message auquel l'utilisateur souhaite répondre (null si aucune réponse en cours) */
  replyingToMessage: Message | null = null;

  /**
   * Constructeur : définit Moussa Diop comme contact actif par défaut au démarrage.
   */
  constructor() {
    this.activeContact = this.conversations[0];
  }

  /**
   * Initialisation du composant.
   * S'abonne au flux de messages du ChatService pour mettre à jour
   * la vue en temps réel à chaque nouveau message ou modification.
   */
  ngOnInit() {
    this.chatService.messages$.subscribe(msgs => {
      this.messages = msgs;
    });
  }

  /**
   * Sélectionne un contact et l'affiche comme conversation active.
   * Désactive tous les autres contacts avant d'activer le contact choisi.
   * @param contact - Le contact à sélectionner
   */
  selectContact(contact: any) {
    this.conversations.forEach(c => c.active = false);
    contact.active = true;
    this.activeContact = contact;
  }

  /**
   * Envoie le message saisi par l'utilisateur.
   * Si une réponse est en cours, elle est incluse dans le message envoyé.
   * Réinitialise le champ et la réponse après l'envoi.
   */
  sendMessage() {
    if (this.newMessage.trim()) {
      this.chatService.sendMessage(this.newMessage, this.replyingToMessage || undefined);
      this.newMessage         = '';
      this.replyingToMessage  = null;
    }
  }

  /**
   * Active le mode édition pour un message envoyé par l'utilisateur.
   * Retire le suffixe " (modifié)" lors de l'édition pour ne pas le dupliquer.
   * Seuls les messages de l'utilisateur connecté ('me') peuvent être modifiés.
   * @param msg - Le message à modifier
   */
  startEdit(msg: Message) {
    if (msg.sender === 'me') {
      this.editingMessageId   = msg.id;
      this.editingMessageText = msg.text.replace(' (modifié)', '');
    }
  }

  /**
   * Sauvegarde les modifications du message en cours d'édition.
   * Ne sauvegarde pas si le texte est vide. Réinitialise le mode édition après.
   */
  saveEdit() {
    if (this.editingMessageId && this.editingMessageText.trim()) {
      this.chatService.editMessage(this.editingMessageId, this.editingMessageText);
      this.editingMessageId   = null;
      this.editingMessageText = '';
    }
  }

  /**
   * Annule la modification en cours sans sauvegarder.
   */
  cancelEdit() {
    this.editingMessageId   = null;
    this.editingMessageText = '';
  }

  /**
   * Supprime un message après confirmation de l'utilisateur.
   * @param id - L'identifiant du message à supprimer
   */
  deleteMessage(id: number) {
    if (confirm('Supprimer ce message ?')) {
      this.chatService.deleteMessage(id);
    }
  }

  /**
   * Initialise une réponse à un message existant.
   * Le message cible sera affiché dans un aperçu au-dessus du champ de saisie.
   * @param msg - Le message auquel on souhaite répondre
   */
  startReply(msg: Message) {
    this.replyingToMessage = msg;
  }

  /**
   * Annule la réponse en cours et masque l'aperçu du message cible.
   */
  cancelReply() {
    this.replyingToMessage = null;
  }
}