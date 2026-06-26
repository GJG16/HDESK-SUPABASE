import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Macro {
  id: string;
  nombre: string;
  contenido: string;
  cambio_estado?: string;
  autor_id: string;
  fecha_creacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class MacroService {
  private apiUrl = environment.apiUrl + '/macros';

  constructor(private http: HttpClient) {}

  getMacros(): Observable<Macro[]> {
    return this.http.get<Macro[]>(this.apiUrl);
  }

  createMacro(data: Partial<Macro>): Observable<Macro> {
    return this.http.post<Macro>(this.apiUrl, data);
  }

  deleteMacro(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
