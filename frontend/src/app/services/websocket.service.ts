import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WebSocketEvent {
  event: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketEvent>();
  
  public messages$ = this.messageSubject.asObservable();

  connect(ticketId: number) {
    if (this.socket) {
      this.socket.close();
    }
    
    // Convert http://... to ws://...
    const wsUrl = environment.apiUrl.replace(/^http/, 'ws') + `/ws/ticket/${ticketId}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        const data: WebSocketEvent = JSON.parse(event.data);
        this.messageSubject.next(data);
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('WS connection closed');
    };

    this.socket.onerror = (error) => {
      console.error('WS error', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
