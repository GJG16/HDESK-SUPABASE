import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardMetrics, MapaCalorResponse, RendimientoResponse,
  Usuario, AreaTecnica, DepartamentoNegocio, AuditoriaItem,
  UsuarioCreate,
} from '../models/helpdesk.models';

const API_URL = 'http://localhost:8000';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  // ─── Reportes (Admin) ─────────────────────────────────────
  getDashboard(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${API_URL}/reportes/dashboard`);
  }

  getRendimiento(): Observable<RendimientoResponse> {
    return this.http.get<RendimientoResponse>(`${API_URL}/reportes/rendimiento`);
  }

  // ─── Mapa de Calor por Departamento (Mejora 3 — Pandas) ──
  getMapaCalorDepartamentos(): Observable<MapaCalorResponse> {
    return this.http.get<MapaCalorResponse>(`${API_URL}/reportes/mapa-calor-departamentos`);
  }

  // ─── Usuarios ─────────────────────────────────────────────
  getUsuarios(rol?: string, activo?: boolean): Observable<Usuario[]> {
    let params: any = {};
    if (rol)              params.rol = rol;
    if (activo !== undefined) params.activo = activo;
    return this.http.get<Usuario[]>(`${API_URL}/usuarios/`, { params });
  }

  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_URL}/usuarios/${id}`);
  }

  crearUsuario(data: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(`${API_URL}/admin/usuarios/`, data);
  }

  desactivarUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${API_URL}/admin/usuarios/${id}/desactivar`, {});
  }

  activarUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${API_URL}/admin/usuarios/${id}/activar`, {});
  }

  // ─── Catálogos ────────────────────────────────────────────
  getAreas(): Observable<AreaTecnica[]> {
    return this.http.get<AreaTecnica[]>(`${API_URL}/areas/`);
  }

  getDepartamentos(): Observable<DepartamentoNegocio[]> {
    return this.http.get<DepartamentoNegocio[]>(`${API_URL}/departamentos/`);
  }

  // ─── Auditoría ────────────────────────────────────────────
  getAuditoria(limit: number = 50): Observable<AuditoriaItem[]> {
    return this.http.get<AuditoriaItem[]>(`${API_URL}/auditoria/`, { params: { limit } });
  }
}
