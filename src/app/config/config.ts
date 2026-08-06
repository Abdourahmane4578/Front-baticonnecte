/**
 * Configuration globale de l'API BatiConnect.
 *
 * - En développement  : pointe vers le backend Spring Boot local (port 8090)
 * - En production     : décommenter la ligne Render et commenter la ligne localhost
 *
 * Utilisation : importer API_URL dans les services pour préfixer les endpoints.
 * Exemple : `${API_URL}/auth/login`
 */

/** URL de base de l'API (développement local) */
export const API_URL = 'http://localhost:8090/api/v1';

/** URL de base de l'API (production sur Render) — décommenter pour le déploiement */
// export const API_URL = 'https://baticonnecte-1.onrender.com/api/v1';