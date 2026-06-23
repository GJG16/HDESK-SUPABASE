import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { SesionUsuario, Usuario, RolUsuario } from '../../models/helpdesk.models';

import { environment } from '../../../environments/environment';

const API_URL   = environment.apiUrl;
const TOKEN_KEY = 'bpo_token';
const USER_KEY  = 'bpo_user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http   = inject(HttpClient);
  private router = inject(Router);

  // Signal reactivo para el usuario actual (Angular 17+)
  private _currentUser = signal<Usuario | null>(this.loadStoredUser());
  readonly currentUser = this._currentUser.asReadonly();

  // ─── Login real contra FastAPI (Mejora 2) ─────────────────
  login(email: string, password: string): Observable<SesionUsuario> {
    return this.http.post<SesionUsuario>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((response) => {
        const usuario: Usuario = {
          ...response.usuario,
          avatar_initials: this.getInitials(response.usuario.nombre),
        };

        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        this._currentUser.set(usuario);
      }),
      catchError((err) => {
        const message = err.error?.detail || 'Error al iniciar sesión';
        return throwError(() => new Error(message));
      })
    );
  }

  // ─── Logout ───────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ─── Token ───────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this._currentUser();
  }

  hasRole(rol: RolUsuario | string): boolean {
    return this._currentUser()?.rol === rol;
  }

  getDefaultRoute(): string {
    switch (this._currentUser()?.rol) {
      case RolUsuario.ADMINISTRADOR: return '/admin/dashboard';
      case RolUsuario.OPERADOR:      return '/operador/dashboard';
      case RolUsuario.ESPECIALISTA:  return '/especialista/dashboard';
      default: return '/login';
    }
  }

  // ─── Helpers ──────────────────────────────────────────────
  private loadStoredUser(): Usuario | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) as Usuario : null;
    } catch { return null; }
  }

  private getInitials(nombre: string): string {
    return nombre.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  }
}
