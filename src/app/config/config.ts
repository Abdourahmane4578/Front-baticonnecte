/**
 * Configuration globale de l'API BatiConnect.
 *
 * - En développement  : pointe vers le backend Spring Boot local (port 8090)
 * - En production     : décommenter la ligne Render et commenter la ligne localhost
 *
 * Utilisation : importer API_URL dans les services pour préfixer les endpoints.
 * Exemple : `${API_URL}/auth/login`
 */

/**
 * URL de base de l'API.
 * Navigateur : même origine (/api/v1) via le proxy ng serve — pas de CORS.
 * SSR (Node) : appel direct à Spring.
 */
export const API_URL =
  typeof globalThis !== 'undefined' && 'window' in globalThis
    ? '/api/v1'
    : 'http://localhost:8090/api/v1';

/** URL de base de l'API (production sur Render) — décommenter pour le déploiement */
// export const API_URL = 'https://baticonnecte-1.onrender.com/api/v1';