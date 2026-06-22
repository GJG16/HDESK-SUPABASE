import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Ticket, CrearTicketDto, PatchTicketDto, HistorialTicket,
  ComentarioTicket, ComentarioCreate,
} from '../models/helpdesk.models';

const API_URL = 'http://localhost:8000';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private http = inject(HttpClient);

  // ─── Consultas ───────────────────────────────────────────────────────

  getTodos(estado?: string, criticidad?: string, id_area?: number, q?: string): Observable<Ticket[]> {
    let params = new HttpParams();
    if (estado)     params = params.set('estado', estado);
    if (criticidad) params = params.set('criticidad', criticidad);
    if (id_area)    params = params.set('id_area', id_area.toString());
    if (q)          params = params.set('q', q);
    return this.http.get<Ticket[]>(`${API_URL}/tickets/`, { params });
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${API_URL}/tickets/${id}`);
  }

  getCriticosPendientes(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${API_URL}/tickets/pendientes/criticos`);
  }

  // ─── Mutaciones ──────────────────────────────────────────────────────

  crearTicket(dto: CrearTicketDto): Observable<Ticket> {
    return this.http.post<Ticket>(`${API_URL}/tickets/triaje/`, dto);
  }

  actualizarTicket(id: number, patch: PatchTicketDto): Observable<Ticket> {
    return this.http.patch<Ticket>(`${API_URL}/tickets/${id}`, patch);
  }

  eliminarTicket(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/tickets/${id}`);
  }

  // ─── Historial / Timeline (Mejora 5) ─────────────────────────────────

  getHistorial(id: number): Observable<HistorialTicket[]> {
    return this.http.get<HistorialTicket[]>(`${API_URL}/tickets/${id}/historial`);
  }

  // ─── Comentarios (Sistema de conversación) ───────────────────────────

  getComentarios(id: number): Observable<ComentarioTicket[]> {
    return this.http.get<ComentarioTicket[]>(`${API_URL}/tickets/${id}/comentarios`);
  }

  crearComentario(id: number, data: ComentarioCreate): Observable<ComentarioTicket> {
    return this.http.post<ComentarioTicket>(`${API_URL}/tickets/${id}/comentarios`, data);
  }

  // ─── Fase 3: CSAT & Adjuntos ─────────────────────────────────────────

  enviarCSAT(id: number, data: any): Observable<any> {
    return this.http.post(`${API_URL}/csat/?id_ticket=${id}`, data);
  }

  getCSAT(id: number): Observable<any> {
    return this.http.get(`${API_URL}/csat/${id}`);
  }

  getAdjuntos(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/tickets/${id}/adjuntos`);
  }

  subirAdjunto(id: number, file: File, id_comentario?: number, id_usuario?: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    let url = `${API_URL}/upload/?id_ticket=${id}`;
    if (id_comentario) url += `&id_comentario=${id_comentario}`;
    if (id_usuario) url += `&id_usuario=${id_usuario}`;
    
    return this.http.post<any>(url, formData);
  }
}

