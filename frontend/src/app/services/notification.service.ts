import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface AppNotification {
  id: string;
  type: string;
  ticket_id: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket: WebSocket | null = null;
  private notificationsSubject = new Subject<AppNotification>();
  private reconnectInterval = 5000;
  
  // Guardamos las notificaciones en memoria temporalmente
  public notifications: AppNotification[] = [];

  constructor(private authService: AuthService) {
    // Escuchar cambios en el login/logout
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  get notifications$(): Observable<AppNotification> {
    return this.notificationsSubject.asObservable();
  }

  private connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) return;

    // Conectar al WebSocket del backend
    // Usamos el hostname actual pero cambiamos http a ws y el puerto al 8000
    // Asumiendo que el frontend está en localhost:4200 y el backend en localhost:8000
    const wsUrl = `ws://localhost:8000/api/ws?token=${token}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: AppNotification = {
          id: Math.random().toString(36).substring(2, 9),
          type: data.type,
          ticket_id: data.ticket_id,
          message: data.message,
          read: false,
          timestamp: new Date()
        };
        
        // Agregar al inicio de la lista local
        this.notifications.unshift(notification);
        
        // Emitir el evento para el Toast visual
        this.notificationsSubject.next(notification);
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket cerrado. Intentando reconectar...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.socket.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      if (this.socket) {
        this.socket.close();
      }
    };
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifications = [];
  }

  public markAsRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }
  
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}
