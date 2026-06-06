// src/app/components/login/login.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router'; // Ajout de Router
import { AuthService } from '../../services/auth'; // Importe ton service d'auth

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html'
})
export class Login {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService, // Injection du service
    private router: Router             // Injection du router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      console.log('Tentative de connexion...', this.loginForm.value);
      
      // Simulation appel réseau
      setTimeout(() => {
        // 1. On informe l'application qu'on est connecté
        this.authService.login();
        
        // 2. On redirige vers l'accueil (ou le dashboard)
        this.router.navigate(['/']); 
        this.isLoading = false;
      }, 1500);
    } else {
      // Si le formulaire est invalide, on marque les champs pour afficher les erreurs
      this.loginForm.markAllAsTouched();
    }
  }
}