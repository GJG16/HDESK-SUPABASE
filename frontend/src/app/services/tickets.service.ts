import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Ticket, CrearTicketDto, PatchTicketDto, HistorialTicket,
  ComentarioTicket, ComentarioCreate,
} from '../models/helpdesk.models';

import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;
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
    return this.http.get<Ticket[]>(`${API_URL}/tickets/`, { params }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${API_URL}/tickets/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getCriticosPendientes(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${API_URL}/tickets/pendientes/criticos`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Mutaciones ──────────────────────────────────────────────────────

  crearTicket(dto: CrearTicketDto): Observable<Ticket> {
    return this.http.post<Ticket>(`${API_URL}/tickets/triaje/`, dto).pipe(
      catchError(err => throwError(() => err))
    );
  }

  actualizarTicket(id: number, patch: PatchTicketDto): Observable<Ticket> {
    return this.http.patch<Ticket>(`${API_URL}/tickets/${id}`, patch).pipe(
      catchError(err => throwError(() => err))
    );
  }

  eliminarTicket(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/tickets/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Historial / Timeline (Mejora 5) ─────────────────────────────────

  getHistorial(id: number): Observable<HistorialTicket[]> {
    return this.http.get<HistorialTicket[]>(`${API_URL}/tickets/${id}/historial`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Comentarios (Sistema de conversación) ───────────────────────────

  getComentarios(id: number): Observable<ComentarioTicket[]> {
    return this.http.get<ComentarioTicket[]>(`${API_URL}/tickets/${id}/comentarios`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  crearComentario(id: number, data: ComentarioCreate): Observable<ComentarioTicket> {
    return this.http.post<ComentarioTicket>(`${API_URL}/tickets/${id}/comentarios`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // ─── Fase 3: CSAT & Adjuntos ─────────────────────────────────────────

  enviarCSAT(id: number, data: any): Observable<any> {
    return this.http.post(`${API_URL}/csat/?id_ticket=${id}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getCSAT(id: number): Observable<any> {
    return this.http.get(`${API_URL}/csat/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getAdjuntos(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/tickets/${id}/adjuntos`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  subirAdjunto(id: number, file: File, id_comentario?: number, id_usuario?: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    let url = `${API_URL}/upload/?id_ticket=${id}`;
    if (id_comentario) url += `&id_comentario=${id_comentario}`;
    if (id_usuario) url += `&id_usuario=${id_usuario}`;
    
    return this.http.post<any>(url, formData).pipe(
      catchError(err => throwError(() => err))
    );
  }
}

