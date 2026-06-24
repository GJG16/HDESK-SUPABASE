import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ArticuloKB, ArticuloKBCreate } from '../models/helpdesk.models';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class KbService {
  private http = inject(HttpClient);

  listar(q?: string) {
    const url = q ? `${API_URL}/kb/?q=${encodeURIComponent(q)}` : `${API_URL}/kb/`;
    return this.http.get<ArticuloKB[]>(url);
  }

  crear(data: ArticuloKBCreate) {
    return this.http.post<ArticuloKB>(`${API_URL}/kb/`, data);
  }
}
