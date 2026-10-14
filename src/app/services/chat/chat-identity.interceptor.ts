import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth';

/**
 * DEV UNIQUEMENT — Ajoute `x-user-id` aux requêtes vers le service Chat pour
 * simuler ce que fera la couche de confiance (API Gateway) en production.
 *
 * ⚠️ Le service Chat lit cet en-tête sans valider aucun jeton : un client peut
 * donc usurper n'importe quel id. Ce n'est PAS une authentification.
 * En production `environment.chat.devIdentityHeader` est false : l'intercepteur
 * ne fait rien et seul le `Authorization: Bearer` (authInterceptor) est envoyé,
 * la Gateway devant le valider et injecter `x-user-id` elle-même.
 */
export const chatIdentityInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.chat.devIdentityHeader) return next(req);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);
  if (!req.url.startsWith(environment.chat.apiUrl)) return next(req);

  const userId = inject(AuthService).getUser()?.id;
  if (!userId) return next(req);

  return next(req.clone({ setHeaders: { 'x-user-id': String(userId) } }));
};
