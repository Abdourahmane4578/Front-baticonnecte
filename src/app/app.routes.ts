import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Accueil',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Connexion',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },
  {
    path: 'ouvriers',
    title: 'Trouver un artisan',
    loadComponent: () => import('./components/ouvriers/ouvriers').then((m) => m.Ouvriers),
  },
  { 
    path: 'register', 
    title: 'Inscription',
    loadComponent: () => import('./components/register/register').then(m => m.Register) 
  },

  {
    path: 'profil/:id',
    title: 'Profil',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profil/profil').then((m) => m.Profil),
  },
  {
    path: 'dashboard',
    title: 'Tableau de bord',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'devis-request/:id',
    title: 'Demande de devis',
    canActivate: [authGuard],
    loadComponent: () => import('./components/devis-request/devis-request').then((m) => m.DevisRequest),
  },

  {
    path: 'messages',
    title: 'Messagerie',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chat/chat').then((m) => m.Chat),
  },
  {
    path: 'publier',
    title: 'Publier',
    canActivate: [authGuard],
    loadComponent: () => import('./components/publish/publish').then((m) => m.Publish),
  },
  {
    path: 'annonces',
    title: 'Les Annonces',
    loadComponent: () => import('./components/job-board/job-board').then((m) => m.JobBoard),
  },
  {
    path: 'parametres',
    title: 'Paramètres',
    canActivate: [authGuard],
    loadComponent: () => import('./components/parametres/parametres').then((m) => m.Parametres),
  },

  {
    path: '**',
    redirectTo: '',
  },
];