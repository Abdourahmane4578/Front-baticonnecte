import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth'; // Ajuste le chemin
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './navbar.html'
})
export class Navbar implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;
  userProfilePic = 'https://api.dicebear.com/8.x/notionists/svg?seed=Felix';

  constructor(private AuthService: AuthService, private router: Router, public theme: ThemeService) {}

  ngOnInit() {
    // On écoute en temps réel si l'utilisateur se connecte ou non
    this.AuthService.isLoggedIn$.subscribe(state => {
      this.isLoggedIn = state;
      if (state) {
        this.currentUser = this.AuthService.getUser();
        const seed = this.currentUser?.nomComplet || this.currentUser?.username || 'Felix';
        this.userProfilePic = this.currentUser?.imageUrl
          || `https://api.dicebear.com/8.x/notionists/svg?seed=${seed}`;
      } else {
        this.currentUser = null;
      }
    });
  }

  logout() {
    this.AuthService.logout();
    this.router.navigate(['/']); // Retour à l'accueil auto
  }
}