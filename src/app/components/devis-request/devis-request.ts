import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Location } from '@angular/common';

@Component({
  selector: 'app-devis-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './devis-request.html'
})
export class DevisRequest implements OnInit {
  devisForm: FormGroup;
  artisanName: string = 'Moussa Diop'; // Mock pour le test

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    public location: Location
  ) {
    this.devisForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      urgence: ['normal', Validators.required],
      budget: ['', [Validators.pattern('^[0-9]*$')]],
      dateSouhaitee: ['', Validators.required]
    });
  }

  ngOnInit() {
    // On pourrait récupérer l'ID de l'artisan ici pour l'afficher
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Logique pour charger les détails de l'artisan
    }
  }

  onSubmit() {
    if (this.devisForm.valid) {
      console.log('Demande envoyée :', this.devisForm.value);
      alert('Votre demande a été envoyée avec succès !');
      this.router.navigate(['/dashboard']); // On renvoie vers le dashboard
    }
  }
}