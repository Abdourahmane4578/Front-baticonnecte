import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // BehaviorSubject permet de stocker l'état et de le diffuser
  private loggedIn = new BehaviorSubject<boolean>(false);
  
  // Observable que les composants vont écouter
  isLoggedIn$ = this.loggedIn.asObservable();

  login() {
    this.loggedIn.next(true);
  }

  logout() {
    this.loggedIn.next(false);
  }

  // Pour obtenir la valeur actuelle rapidement
  get isUserConnected(): boolean {
    return this.loggedIn.value;
  }
}