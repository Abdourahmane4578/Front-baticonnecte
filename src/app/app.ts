import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { Navbar } from './components/navbar/navbar'; // Assure-toi que ce composant existe

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  template: `
    <div class="site-shell">
      <app-navbar></app-navbar>
      <main class="site-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class App implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit() {
    if (this.authService.isUserConnected) {
      this.authService.getProfile().subscribe({
        error: (err) => {
          console.error('Erreur lors du rafraîchissement du profil au démarrage', err);
          // Si le token est invalide (par ex: 401 Unauthorized), on pourrait déconnecter l'utilisateur:
          // this.authService.logout();
        }
      });
    }
  }
} // <-- BIEN UTILISER "App" ICI