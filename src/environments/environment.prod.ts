/**
 * Environnement de PRODUCTION.
 * Les URL ci-dessous doivent pointer vers l'API Gateway (ou le reverse proxy) qui
 * valide le JWT BatiConnecte et injecte l'identité (`x-user-id`) vers le service Chat.
 * Le frontend n'envoie alors que `Authorization: Bearer <token>` (déjà fait par authInterceptor).
 */
export const environment = {
  production: true,

  /** API Spring déployée. Le site statique n'a pas le proxy /api de ng serve. */
  apiUrl: 'https://baticonnecte-1.onrender.com/api/v1',
  serverApiUrl: 'https://baticonnecte-1.onrender.com/api/v1',

  chat: {
    // À remplacer par l'URL publique de la Gateway devant le service Chat.
    apiUrl: 'https://chat.baticonnect.example.com',
    socketUrl: 'https://chat.baticonnect.example.com',
    /** Jamais true en production : l'identité doit venir d'une couche de confiance. */
    devIdentityHeader: false,
    pageSize: 20,
  },
};
