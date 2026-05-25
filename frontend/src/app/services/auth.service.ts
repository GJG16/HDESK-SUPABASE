import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, TokenResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('access_token'));
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  /**
   * Registrar nuevo usuario
   */
  register(user: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user);
  }

  /**
   * Login de usuario
   */
  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  /**
   * Refrescar token
   */
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post(`${this.apiUrl}/refresh`, { refresh_token: refreshToken }).pipe(
      tap((response: any) => {
        localStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  /**
   * Manejar respuesta de autenticación
   */
  private handleAuthResponse(response: TokenResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.tokenSubject.next(response.access_token);
  }

  /**
   * Cargar usuario del localStorage
   */
  private loadUserFromStorage(): void {
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        this.currentUserSubject.next(JSON.parse(user));
      } catch (e) {
        console.error('Error al cargar usuario:', e);
      }
    }
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtener rol actual
   */
  getCurrentRole(): User['rol'] | null {
    return this.currentUserSubject.value?.rol ?? null;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Verificar si es admin
   */
  isAdmin(): boolean {
    return this.currentUserSubject.value?.rol === 'admin';
  }

  /**
   * Verificar si es agente
   */
  isAgent(): boolean {
    return this.currentUserSubject.value?.rol === 'agent';
  }

  /**
   * Verificar si es usuario final
   */
  isUser(): boolean {
    return this.currentUserSubject.value?.rol === 'user';
  }

  /**
   * Verificar si puede gestionar tickets como back-office
   */
  canManageTickets(): boolean {
    return this.isAdmin() || this.isAgent();
  }

  /**
   * Verificar si puede eliminar un ticket concreto
   */
  canDeleteTicket(ticketOwnerId?: string): boolean {
    const currentUser = this.currentUserSubject.value;
    return !!currentUser && (currentUser.rol === 'admin' || currentUser.id === ticketOwnerId);
  }
}
