import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth'; // Ajuste le chemin

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html'
})
export class Navbar implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;
  userProfilePic = 'https://api.dicebear.com/8.x/notionists/svg?seed=Felix';

  constructor(private AuthService: AuthService, private router: Router) {}

  ngOnInit() {
    // On écoute en temps réel si l'utilisateur se connecte ou non
    this.AuthService.isLoggedIn$.subscribe(state => {
      this.isLoggedIn = state;
      if (state) {
        this.currentUser = this.AuthService.getUser();
        if (this.currentUser && this.currentUser.username) {
          this.userProfilePic = `https://api.dicebear.com/8.x/notionists/svg?seed=${this.currentUser.username}`;
        }
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