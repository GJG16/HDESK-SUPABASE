import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Macro, MacroCreate } from '../models/helpdesk.models';

const API_URL = 'http://localhost:8000';

@Injectable({ providedIn: 'root' })
export class MacrosService {
  private http = inject(HttpClient);

  listar(idArea?: number) {
    const url = idArea ? `${API_URL}/macros/?id_area=${idArea}` : `${API_URL}/macros/`;
    return this.http.get<Macro[]>(url);
  }

  crear(data: MacroCreate) {
    return this.http.post<Macro>(`${API_URL}/macros/`, data);
  }
}
