import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Interface Message
 * Représente un message dans une conversation du chat.
 * Le champ `replyTo` est optionnel et permet d'implémenter
 * la fonctionnalité de réponse à un message spécifique.
 */
export interface Message {
  /** Identifiant unique du message (généré via Date.now()) */
  id: number;

  /** Expéditeur du message : 'me' = utilisateur connecté, 'other' = interlocuteur */
  sender: string;

  /** Contenu textuel du message */
  text: string;

  /** Heure d'envoi au format 'HH:MM' */
  time: string;

  /** Message auquel celui-ci répond (optionnel) */
  replyTo?: Message;
}

/**
 * ChatService
 * Service centralisé pour la gestion des messages du chat.
 * Utilise un BehaviorSubject pour maintenir l'état réactif des messages
 * et le partager entre tous les composants abonnés.
 *
 * En production, ce service devra être connecté à un WebSocket ou à
 * une API REST pour la messagerie en temps réel.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {

  /**
   * Messages de démonstration affichés au démarrage.
   * Simulent une conversation existante entre l'utilisateur et un contact.
   * À remplacer par un appel API pour charger l'historique réel.
   */
  private initialMessages: Message[] = [
    { id: 1, sender: 'other', text: 'Bonjour, êtes-vous disponible pour mon chantier ?',      time: '10:00' },
    { id: 2, sender: 'me',    text: 'Bonjour ! Oui, je suis disponible la semaine prochaine.', time: '10:05' },
    { id: 3, sender: 'other', text: 'Parfait, quels sont vos tarifs ?',                        time: '10:06' },
  ];

  /**
   * Source de vérité réactive pour la liste des messages.
   * BehaviorSubject émet la dernière valeur aux nouveaux abonnés.
   */
  private messagesSubject = new BehaviorSubject<Message[]>(this.initialMessages);

  /** Observable public exposé aux composants pour s'abonner aux changements */
  messages$ = this.messagesSubject.asObservable();

  constructor() { }

  /**
   * Retourne la valeur instantanée de la liste des messages (snapshot).
   * Utile pour les opérations qui nécessitent la liste courante sans s'abonner.
   */
  getMessages() {
    return this.messagesSubject.value;
  }

  /**
   * Envoie un nouveau message de l'utilisateur connecté ('me').
   * Génère un ID unique via Date.now() et formate l'heure automatiquement.
   * Le message est ajouté à la fin de la liste existante.
   *
   * @param text    - Le contenu du message à envoyer
   * @param replyTo - (Optionnel) Le message auquel on répond
   */
  sendMessage(text: string, replyTo?: Message) {
    const msg: Message = {
      id:      Date.now(),
      sender:  'me',
      text,
      time:    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo
    };
    // Ajoute le nouveau message à la liste existante (immutabilité via spread)
    this.messagesSubject.next([...this.getMessages(), msg]);
  }

  /**
   * Modifie le texte d'un message existant envoyé par l'utilisateur ('me').
   * Ajoute le suffixe " (modifié)" pour informer l'interlocuteur de la modification.
   * Un message d'un autre expéditeur ne peut pas être modifié.
   *
   * @param id      - L'identifiant du message à modifier
   * @param newText - Le nouveau contenu du message
   */
  editMessage(id: number, newText: string) {
    const updated = this.getMessages().map(m => {
      if (m.id === id && m.sender === 'me') {
        return { ...m, text: newText + ' (modifié)' };
      }
      return m;
    });
    this.messagesSubject.next(updated);
  }

  /**
   * Supprime un message de la conversation par son identifiant.
   * Tous les messages dont l'ID correspond sont retirés de la liste.
   *
   * @param id - L'identifiant du message à supprimer
   */
  deleteMessage(id: number) {
    const updated = this.getMessages().filter(m => m.id !== id);
    this.messagesSubject.next(updated);
  }
}
