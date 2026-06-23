import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardMetrics, MapaCalorResponse, RendimientoResponse,
  Usuario, AreaTecnica, DepartamentoNegocio, AuditoriaItem,
  UsuarioCreate, ForecastingPicosResponse
} from '../models/helpdesk.models';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  // ─── Reportes (Admin) ─────────────────────────────────────
  getDashboard(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${API_URL}/reportes/dashboard`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getRendimiento(): Observable<RendimientoResponse> {
    return this.http.get<RendimientoResponse>(`${API_URL}/reportes/rendimiento`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Mapa de Calor por Departamento (Mejora 3 — Pandas) ──
  getMapaCalorDepartamentos(): Observable<MapaCalorResponse> {
    return this.http.get<MapaCalorResponse>(`${API_URL}/reportes/mapa-calor-departamentos`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Forecasting Picos (Pandas) ───────────────────────────
  getForecastingPicos(): Observable<ForecastingPicosResponse> {
    return this.http.get<ForecastingPicosResponse>(`${API_URL}/reportes/forecasting-picos`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Usuarios ─────────────────────────────────────────────
  getUsuarios(rol?: string, activo?: boolean): Observable<Usuario[]> {
    let params: any = {};
    if (rol)              params.rol = rol;
    if (activo !== undefined) params.activo = activo;
    return this.http.get<Usuario[]>(`${API_URL}/usuarios/`, { params }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_URL}/usuarios/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  crearUsuario(data: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(`${API_URL}/admin/usuarios/`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  desactivarUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${API_URL}/admin/usuarios/${id}/desactivar`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

  activarUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${API_URL}/admin/usuarios/${id}/activar`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Catálogos ────────────────────────────────────────────
  getAreas(): Observable<AreaTecnica[]> {
    return this.http.get<AreaTecnica[]>(`${API_URL}/areas/`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getDepartamentos(): Observable<DepartamentoNegocio[]> {
    return this.http.get<DepartamentoNegocio[]>(`${API_URL}/departamentos/`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Auditoría ────────────────────────────────────────────
  getAuditoria(limit: number = 50): Observable<AuditoriaItem[]> {
    return this.http.get<AuditoriaItem[]>(`${API_URL}/auditoria/`, { params: { limit } }).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
