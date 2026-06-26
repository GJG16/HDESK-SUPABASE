import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor_admin_id: string;
  actor_admin_nombre?: string;
  resource_label?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = environment.apiUrl + '/reports';

  constructor(private http: HttpClient) {}

  getAuditLogs(limit: number = 20): Observable<AuditLog[]> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit`, { params });
  }
}
