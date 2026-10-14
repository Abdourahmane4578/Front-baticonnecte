/**
 * Configuration globale de l'API BatiConnect.
 *
 * - En développement  : pointe vers le backend Spring Boot local (port 8090)
 * - En production     : décommenter la ligne Render et commenter la ligne localhost
 *
 * Utilisation : importer API_URL dans les services pour préfixer les endpoints.
 * Exemple : `${API_URL}/auth/login`
 */

import { environment } from '../../environments/environment';

/**
 * URL de base de l'API.
 * Navigateur en local : /api/v1, relayé par le proxy ng serve.
 * Build de production : l'API Render, sinon le site renvoie son HTML et JSON.parse échoue.
 * SSR (Node) : appel direct, sans le proxy du navigateur.
 */
export const API_URL =
  typeof globalThis !== 'undefined' && 'window' in globalThis
    ? environment.apiUrl
    : environment.serverApiUrl;