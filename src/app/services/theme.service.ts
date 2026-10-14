import { Inject, Injectable, PLATFORM_ID, signal, computed } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'bc-theme';
const THEME_LIGHT = 'baticonnect';
const THEME_DARK = 'baticonnect-dark';

/**
 * Gère le thème clair / sombre de l'application.
 * - 'system' : suit la préférence de l'OS (aucun attribut data-theme, DaisyUI applique le thème --prefersdark)
 * - 'light' / 'dark' : force un thème et le mémorise dans localStorage
 * Le script inline de index.html applique le thème mémorisé avant le premier rendu pour éviter tout flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser: boolean;
  private readonly media: MediaQueryList | null = null;

  /** Préférence choisie par l'utilisateur. */
  readonly preference = signal<ThemePreference>('system');
  /** Préférence système (true = sombre). */
  private readonly systemDark = signal(false);

  /** Thème effectivement affiché. */
  readonly isDark = computed(() =>
    this.preference() === 'dark' || (this.preference() === 'system' && this.systemDark())
  );

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (!this.isBrowser) return;

    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDark.set(this.media.matches);
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));

    const stored = this.readStored();
    this.preference.set(stored);
    this.apply(stored);
  }

  /** Bascule clair ⇄ sombre (à partir du thème effectivement affiché). */
  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(pref: ThemePreference): void {
    this.preference.set(pref);
    this.apply(pref);
    if (!this.isBrowser) return;
    try {
      if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }

  private apply(pref: ThemePreference): void {
    const root = this.document.documentElement;
    if (pref === 'light') root.setAttribute('data-theme', THEME_LIGHT);
    else if (pref === 'dark') root.setAttribute('data-theme', THEME_DARK);
    else root.removeAttribute('data-theme');
  }

  private readStored(): ThemePreference {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
