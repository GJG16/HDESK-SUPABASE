import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TicketsService } from '../../../services/tickets.service';
import { DashboardService } from '../../../services/dashboard.service';
import { WebsocketService } from '../../../services/websocket.service';
import { MacrosService } from '../../../services/macros.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import {
  Ticket, HistorialTicket, ComentarioTicket, RolUsuario, Macro, Adjunto, CSAT
} from '../../../models/helpdesk.models';
import { environment } from '../../../../environments/environment';

import { TicketPropertiesComponent } from './components/ticket-properties/ticket-properties.component';
import { TicketConversationComponent, CommentData } from './components/ticket-conversation/ticket-conversation.component';
import { TicketTimelineComponent } from './components/ticket-timeline/ticket-timeline.component';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    TiempoRelativoPipe,
    TicketPropertiesComponent,
    TicketConversationComponent,
    TicketTimelineComponent
  ],
  templateUrl: './ticket-detail.component.html',
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  route        = inject(ActivatedRoute);
  router       = inject(Router);
  location     = inject(Location);
  ticketsSvc   = inject(TicketsService);
  dashSvc      = inject(DashboardService);
  wsSvc        = inject(WebsocketService);
  macrosSvc    = inject(MacrosService);
  auth         = inject(AuthService);
  toast        = inject(ToastService);
  fb           = inject(FormBuilder);

  apiUrl       = environment.apiUrl;

  ticket       = signal<Ticket | null>(null);
  historial    = signal<HistorialTicket[]>([]);
  comentarios  = signal<ComentarioTicket[]>([]);
  macros       = signal<Macro[]>([]);
  adjuntos     = signal<Adjunto[]>([]);
  csat         = signal<CSAT | null>(null);
  enviandoComentario = signal(false);

  calificacion = signal(0);
  csatCommentControl = this.fb.control('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.goBack(); return; }
    this.loadTicket(id);
  }

  loadTicket(id: number) {
    forkJoin({
      ticket: this.ticketsSvc.getById(id),
      historial: this.ticketsSvc.getHistorial(id),
      comentarios: this.ticketsSvc.getComentarios(id),
      adjuntos: this.ticketsSvc.getAdjuntos(id),
    }).subscribe({
      next: (data) => {
        this.ticket.set(data.ticket);
        this.historial.set(data.historial);
        this.comentarios.set(data.comentarios);
        this.adjuntos.set(data.adjuntos);
        
        if (this.isAdminOrEspecialista()) {
          this.macrosSvc.listar(data.ticket.id_area).subscribe(m => this.macros.set(m));
        }

        if (data.ticket.estado === 'Resuelto') {
          this.ticketsSvc.getCSAT(id).subscribe({
            next: (csatData) => this.csat.set(csatData),
            error: () => this.csat.set(null)
          });
        }
        
        // Conectar WebSocket y suscribirse a eventos
        this.wsSvc.connect(id);
        this.wsSvc.messages$.subscribe(msg => {
          if (msg.event === 'new_comment') {
            // Check if comment already exists (e.g. we sent it)
            const exists = this.comentarios().find(c => c.id === msg.payload.id);
            if (!exists) {
              this.comentarios.update(cs => [...cs, msg.payload]);
              // Also update historial just in case it caused an event, though usually state change triggers historial
            }
          } else if (msg.event === 'ticket_updated') {
            this.ticket.set(msg.payload);
            // Refresh historial
            this.ticketsSvc.getHistorial(id).subscribe(h => this.historial.set(h));
          }
        });
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el ticket');
        this.goBack();
      },
    });
  }

  ngOnDestroy() {
    this.wsSvc.disconnect();
  }

  goBack() {
    this.location.back();
  }

  rolePath(): string {
    const r = this.auth.currentUser()?.rol;
    if (r === RolUsuario.ADMINISTRADOR) return 'admin';
    if (r === RolUsuario.ESPECIALISTA) return 'especialista';
    if (r === RolUsuario.OPERADOR) return 'operador';
    return 'login';
  }

  isAdminOrEspecialista(): boolean {
    const r = this.auth.currentUser()?.rol;
    return r === RolUsuario.ADMINISTRADOR || r === RolUsuario.ESPECIALISTA;
  }

  isOperador(): boolean {
    return this.auth.currentUser()?.rol === RolUsuario.OPERADOR;
  }

  cambiarEstado(nuevoEstado: string) {
    if (!this.isAdminOrEspecialista()) return;
    const t = this.ticket()!;
    this.ticketsSvc.actualizarTicket(t.id, { estado: nuevoEstado, version: t.version }).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.toast.success('Estado actualizado', `#${t.id} → ${nuevoEstado}`);
        this.ticketsSvc.getHistorial(t.id).subscribe(h => this.historial.set(h));
      },
      error: (err) => this.toast.error('Error', err.error?.detail || 'No se pudo actualizar'),
    });
  }

  handleComment(data: CommentData, conversationComponent: TicketConversationComponent) {
    this.enviandoComentario.set(true);
    const t = this.ticket()!;
    const userId = this.auth.currentUser()?.id;

    this.ticketsSvc.crearComentario(t.id, {
      contenido: data.contenido,
      es_nota_interna: data.es_nota_interna,
      id_usuario: userId,
    }).subscribe({
      next: (c) => {
        this.comentarios.update(cs => [...cs, c]);
        
        if (data.file) {
          this.ticketsSvc.subirAdjunto(t.id, data.file, c.id, userId).subscribe({
            next: (adj) => {
              this.adjuntos.update(ads => [...ads, adj]);
              this.finalizarComentario(conversationComponent);
            },
            error: () => {
              this.toast.error('Atención', 'Comentario guardado, pero falló la subida del archivo');
              this.finalizarComentario(conversationComponent);
            }
          });
        } else {
          this.finalizarComentario(conversationComponent);
        }
      },
      error: () => {
        this.enviandoComentario.set(false);
        this.toast.error('Error', 'No se pudo agregar el comentario');
      },
    });
  }

  private finalizarComentario(conversationComponent: TicketConversationComponent) {
    this.enviandoComentario.set(false);
    this.toast.success('Comentario agregado', '');
    conversationComponent.resetForm();
  }

  enviarCSAT() {
    if (this.calificacion() === 0) return;
    const t = this.ticket()!;
    const data = {
      calificacion: this.calificacion(),
      comentario: this.csatCommentControl.value || '',
      id_usuario: this.auth.currentUser()?.id
    };
    
    this.ticketsSvc.enviarCSAT(t.id, data).subscribe({
      next: (res) => {
        this.csat.set(res);
        this.toast.success('¡Gracias!', 'Tu calificación ha sido enviada');
      },
      error: (err) => this.toast.error('Error', err.error?.detail || 'No se pudo enviar')
    });
  }

  getAdjuntoUrl(ruta: string): string {
    // Si la ruta ya es una URL absoluta (Supabase Storage), usarla directamente
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
      return ruta;
    }
    // Si es relativa (local /uploads/...), prefijar con apiUrl
    return this.apiUrl + ruta;
  }
}
