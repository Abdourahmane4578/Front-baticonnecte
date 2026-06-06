import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html'
})
export class Register {
  registerForm: FormGroup;
  userType: 'particulier' | 'ouvrier' = 'particulier';
  isLoading = false;

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  setUserType(type: 'particulier' | 'ouvrier') {
    this.userType = type;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const data = { ...this.registerForm.value, role: this.userType };
      console.log('Inscription envoyée :', data);
      
      // Simulation appel réseau
      setTimeout(() => {
        this.isLoading = false;
        // Navigation ou message de succès ici
      }, 1500);
    }
  }
}