import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth';

// Validateur pour détecter les erreurs courantes de frappe dans l'email
export function emailTypoValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value;
  if (!email || typeof email !== 'string') return null;
  
  const lowerEmail = email.toLowerCase();
  
  const typos = [
    '@gmai.com', '@gmil.com', '@gmal.com', '@gmail.co', '@gmail.cm',
    '@hotmai.com', '@hotmal.com', '@hotmail.co',
    '@yahooo.com', '@yaho.com', '@yahoo.co',
    '@outloo.com', '@outlook.co'
  ];
  
  for (const typo of typos) {
    if (lowerEmail.endsWith(typo)) {
      return { emailTypo: true };
    }
  }
  
  // Basic validation to ensure there is a dot in the domain part
  const domainPart = lowerEmail.split('@')[1];
  if (domainPart && !domainPart.includes('.')) {
    return { invalidDomain: true };
  }
  
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './register.html'
})
export class Register {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      nomComplet: ['', [Validators.required, Validators.minLength(2)]],
      adresse: ['', [Validators.required]],
      ville: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, emailTypoValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['CLIENT', [Validators.required]] // OUVRIER ou CLIENT
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      const data = this.registerForm.value;
      console.log('Inscription envoyée :', data);
      
      this.authService.register(data).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res && res.error) {
            this.errorMessage = res.error;
            this.cdr.detectChanges();
          } else {
            this.router.navigate(['/login']); // Redirection vers le login après inscription
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Erreur lors de l\'inscription', err);
          
          if (err.status === 400) {
            this.errorMessage = 'Veuillez vérifier les informations saisies.';
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
            this.errorMessage = 'Erreur lors de l\'inscription. Il est possible que cet e-mail soit déjà utilisé.';
          }
          
          this.cdr.detectChanges();
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}