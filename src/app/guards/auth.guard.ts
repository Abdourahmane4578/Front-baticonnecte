import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isUserConnected) {
    return true;
  }

  // Rediriger vers la page de connexion si non connecté
  return router.parseUrl('/login');
};
