/**
 * Environnement de DÉVELOPPEMENT (fichier par défaut).
 * En production, angular.json remplace ce fichier par environment.prod.ts (fileReplacements).
 */
export const environment = {
  production: false,

  /** API métier. En local, le proxy ng serve envoie /api vers le port 8090. */
  apiUrl: '/api/v1',
  /** Même API, appelée par le serveur Node (pas de proxy navigateur). */
  serverApiUrl: 'http://localhost:8090/api/v1',

  /** Service Chat externe (Node/Express + Socket.IO + MongoDB). */
  chat: {
    /** Base de l'API REST du service Chat (sans slash final). */
    apiUrl: 'http://localhost:3000',
    /** URL du serveur Socket.IO (même hôte que l'API en local). */
    socketUrl: 'http://localhost:3000',
    /**
     * DEV UNIQUEMENT — simule la couche de confiance (API Gateway) en envoyant
     * l'en-tête `x-user-id` et `handshake.auth.user_id` depuis le navigateur.
     * Le service Chat ne valide aucun jeton : cette identité est forgeable et ne
     * constitue PAS une authentification. En production ce flag doit rester à false
     * et une Gateway doit valider le JWT puis injecter `x-user-id`.
     */
    devIdentityHeader: true,
    /** Taille de page pour l'historique (le service applique 20 par défaut). */
    pageSize: 20,
  },
};
