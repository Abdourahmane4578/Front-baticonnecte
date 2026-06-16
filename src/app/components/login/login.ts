// src/app/components/login/login.ts
import { Component, ChangeDetectorRef } from '@angular/core';
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
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // Ajout pour forcer l'affichage
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      console.log('Tentative de connexion...', this.loginForm.value);
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          // Certains backends renvoient l'erreur dans un statut 200 OK
          if (res && res.error) {
            this.errorMessage = res.error;
            this.cdr.detectChanges(); // Forcer la mise à jour visuelle
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Erreur de connexion brute reçue :', err);
          
          if (err.status === 0) {
            this.errorMessage = "Problème de réseau ou erreur CORS (le backend bloque la réponse).";
          } else if (err.status === 400) {
            this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
          } else if (err.error && err.error.error) {
            this.errorMessage = err.error.error;
          } else if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
          } else if (err.error && typeof err.error === 'string') {
            try {
              const parsed = JSON.parse(err.error);
              this.errorMessage = parsed.error || parsed.message || err.error;
            } catch (e) {
              this.errorMessage = err.error;
            }
          } else {
            this.errorMessage = 'Identifiants incorrects ou erreur serveur.';
          }
          
          console.log('=== DEBUG: Valeur de errorMessage assignée ===', this.errorMessage);
          this.cdr.detectChanges(); // Forcer la mise à jour visuelle
        }
      });
    } else {
      // Si le formulaire est invalide, on marque les champs pour afficher les erreurs
      this.loginForm.markAllAsTouched();
    }
  }
}