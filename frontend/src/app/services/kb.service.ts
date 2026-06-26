import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KbArticle {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  etiquetas: string[];
  autor_id: string;
  vistas: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class KbService {
  private apiUrl = environment.apiUrl + '/kb';

  constructor(private http: HttpClient) {}

  getArticles(): Observable<KbArticle[]> {
    return this.http.get<KbArticle[]>(this.apiUrl);
  }

  getArticle(id: string): Observable<KbArticle> {
    return this.http.get<KbArticle>(`${this.apiUrl}/${id}`);
  }

  createArticle(data: Partial<KbArticle>): Observable<KbArticle> {
    return this.http.post<KbArticle>(this.apiUrl, data);
  }

  deleteArticle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
