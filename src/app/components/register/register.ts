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

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      city: ['', [Validators.required]],
      // Champs spécifiques à l'ouvrier (facultatifs selon le rôle)
      speciality: [''],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]]
    });
  }

  setUserType(type: 'particulier' | 'ouvrier') {
    this.userType = type;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const data = { ...this.registerForm.value, role: this.userType };
      console.log('Inscription envoyée :', data);
      // C'est ici qu'on enverra les données vers Spring Boot plus tard
    }
  }
}