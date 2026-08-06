import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * JobService
 * Service centralisé pour la gestion des annonces du Job Board.
 * Utilise un BehaviorSubject pour maintenir un état réactif partagé
 * entre tous les composants abonnés (JobBoard, Publish, etc.).
 *
 * En production, les méthodes CRUD devront appeler l'API backend
 * à la place des manipulations locales sur le tableau.
 */
@Injectable({
  providedIn: 'root'
})
export class JobService {

  /**
   * Données de démonstration initiales pour le Job Board.
   * Chaque annonce contient les informations du post, les interactions
   * sociales (likes, commentaires) et les données de l'auteur.
   * À remplacer par un appel GET /api/v1/annonces en production.
   */
  private initialAnnonces = [
    {
      id: 1, titre: 'Rénovation électrique appartement 3 pièces', metier: 'Electricien',
      ville: 'Conakry', description: 'Besoin de refaire toute l\'installation électrique d\'un appartement de 60m2. Matériel non fourni.',
      budget: '2.500.000', urgence: 'Dans le mois', date: 'Il y a 2 heures',
      client: 'Alpha Barry', authorId: 2, likes: 12, likedByMe: false,
      comments: [{ id: 1, author: 'Moussa Diop', text: 'Je suis disponible, je vous contacte.' }]
    },
    {
      id: 2, titre: 'Fuite d\'eau sous l\'évier', metier: 'Plombier',
      ville: 'Conakry', description: 'Grosse fuite d\'eau sous l\'évier de la cuisine, besoin d\'une intervention rapide.',
      budget: '150.000', urgence: 'Urgent', date: 'Il y a 5 heures',
      client: 'Fatoumata Camara', authorId: 3, likes: 5, likedByMe: true, comments: []
    },
    {
      id: 3, titre: 'Peinture façade maison', metier: 'Peintre',
      ville: 'Kindia', description: 'Peinture extérieure pour une maison R+1. Je fournis la peinture, je cherche juste la main d\'œuvre.',
      budget: '1.200.000', urgence: 'Dès que possible', date: 'Hier',
      client: 'Moi (Client)', authorId: 1, likes: 0, likedByMe: false, comments: [] // ← Simule un post de l'utilisateur connecté
    },
    {
      id: 4, titre: 'Installation de 2 climatiseurs', metier: 'Frigoriste',
      ville: 'Conakry', description: 'J\'ai acheté 2 climatiseurs split, j\'ai besoin d\'un professionnel pour l\'installation.',
      budget: '400.000', urgence: 'Dans le mois', date: 'Hier',
      client: 'Mariam Sylla', authorId: 5, likes: 24, likedByMe: false, comments: []
    }
  ];

  /**
   * Source de vérité réactive pour la liste des annonces.
   * BehaviorSubject émet la dernière valeur aux nouveaux abonnés.
   */
  private annoncesSubject = new BehaviorSubject<any[]>(this.initialAnnonces);

  /** Observable public exposé aux composants pour s'abonner aux changements */
  annonces$ = this.annoncesSubject.asObservable();

  constructor() { }

  /**
   * Retourne la valeur instantanée de la liste des annonces (snapshot).
   * Utile pour les opérations qui nécessitent la liste courante sans s'abonner.
   */
  getAnnonces() {
    return this.annoncesSubject.value;
  }

  /**
   * Ajoute une nouvelle annonce en tête de liste.
   * Complète l'annonce avec les métadonnées système (id, date, client simulé, etc.)
   * @param annonce - Les données du formulaire de publication
   */
  addAnnonce(annonce: any) {
    const currentList = this.getAnnonces();

    const newAnnonce = {
      ...annonce,
      id:         currentList.length + 1,
      date:       'À l\'instant',
      client:     'Moi (Client)', // Simule l'utilisateur connecté
      authorId:   1,              // ID simulé pour 'Moi' (à remplacer par l'ID réel)
      likes:      0,
      likedByMe:  false,
      comments:   []
    };

    // Insère la nouvelle annonce au début de la liste
    this.annoncesSubject.next([newAnnonce, ...currentList]);
  }

  /**
   * Supprime une annonce par son identifiant.
   * @param id - L'identifiant de l'annonce à supprimer
   */
  deleteAnnonce(id: number) {
    const currentList  = this.getAnnonces();
    const updatedList  = currentList.filter(a => a.id !== id);
    this.annoncesSubject.next(updatedList);
  }

  /**
   * Met à jour les champs d'une annonce existante (titre, description, budget).
   * Fusionne les nouvelles données avec l'objet existant via le spread operator.
   * @param id   - L'identifiant de l'annonce à modifier
   * @param data - Les nouvelles données à fusionner (champs partiels acceptés)
   */
  editAnnonce(id: number, data: any) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => a.id === id ? { ...a, ...data } : a);
    this.annoncesSubject.next(updatedList);
  }

  /**
   * Ajoute un commentaire à une annonce.
   * Génère un ID unique via Date.now() pour chaque nouveau commentaire.
   * @param postId - L'identifiant de l'annonce à commenter
   * @param author - Le nom de l'auteur du commentaire
   * @param text   - Le contenu du commentaire
   */
  addComment(postId: number, author: string, text: string) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => {
      if (a.id === postId) {
        return {
          ...a,
          comments: [...a.comments, { id: Date.now(), author, text }]
        };
      }
      return a;
    });
    this.annoncesSubject.next(updatedList);
  }

  /**
   * Bascule le like d'un post pour l'utilisateur connecté.
   * Incrémente ou décrémente le compteur de likes selon l'état actuel.
   * @param postId - L'identifiant du post à liker/unliker
   */
  toggleLike(postId: number) {
    const currentList = this.getAnnonces();
    const updatedList = currentList.map(a => {
      if (a.id === postId) {
        const isLiked = !a.likedByMe;
        return {
          ...a,
          likedByMe: isLiked,
          likes:     isLiked ? a.likes + 1 : a.likes - 1
        };
      }
      return a;
    });
    this.annoncesSubject.next(updatedList);
  }
}
