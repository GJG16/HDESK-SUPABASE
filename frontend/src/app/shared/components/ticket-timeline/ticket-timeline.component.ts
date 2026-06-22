import { Component, Input, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketsService } from '../../../services/tickets.service';
import { TiempoRelativoPipe } from '../../pipes/tiempo-relativo.pipe';
import { HistorialTicket } from '../../../models/helpdesk.models';

/**
 * Componente reutilizable de Timeline/Línea de Tiempo para el detalle del ticket.
 * Muestra cronológicamente cada cambio de estado con nodos coloreados.
 *
 * Uso: <app-ticket-timeline [ticketId]="2045"></app-ticket-timeline>
 */
@Component({
  selector: 'app-ticket-timeline',
  standalone: true,
  imports: [CommonModule, TiempoRelativoPipe],
  template: `
<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
  <div class="px-6 py-4 border-b border-slate-100">
    <h3 class="text-base font-bold text-slate-900">📋 Línea de Tiempo</h3>
    <p class="text-xs text-slate-400">Historial de cambios de estado del ticket #{{ ticketId }}</p>
  </div>

  <div class="p-6">
    <!-- Loading -->
    <div *ngIf="loading()" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <span class="ml-3 text-sm text-slate-400">Cargando historial...</span>
    </div>

    <!-- Timeline -->
    <div *ngIf="!loading() && historial().length > 0" class="relative ml-4">
      <!-- Línea vertical -->
      <div class="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-slate-100"></div>

      <div *ngFor="let h of historial(); let i = index; let last = last"
        class="relative pl-12 pb-6 animate-fade-in" [class.pb-0]="last"
        [style.animation-delay]="(i * 100) + 'ms'">

        <!-- Nodo circular del timeline -->
        <div class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ring-4 ring-white"
          [ngClass]="getNodeClass(h.estado_nuevo)">
          <span [innerHTML]="getNodeIcon(h.estado_nuevo)"></span>
        </div>

        <!-- Contenido del evento -->
        <div class="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-4 transition-colors border border-slate-100">
          <!-- Estado -->
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span *ngIf="h.estado_anterior"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                [ngClass]="getEstadoBadgeClass(h.estado_anterior)">
                {{ h.estado_anterior }}
              </span>
              <svg *ngIf="h.estado_anterior" class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                [ngClass]="getEstadoBadgeClass(h.estado_nuevo)">
                {{ h.estado_nuevo || 'Creado' }}
              </span>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">{{ h.fecha | tiempoRelativo }}</span>
          </div>

          <!-- Usuario responsable -->
          <p *ngIf="h.nombre_usuario" class="text-xs text-slate-600 flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-slate-300 text-white text-[9px] font-bold flex items-center justify-center">
              {{ h.nombre_usuario.split(' ').map(getFirstChar).join('').substring(0, 2) }}
            </span>
            {{ h.nombre_usuario }}
          </p>

          <!-- Comentario -->
          <p *ngIf="h.comentario" class="text-xs text-slate-500 mt-2 pl-1 border-l-2 border-slate-200 italic">
            {{ h.comentario }}
          </p>

          <!-- Fecha absoluta -->
          <p class="text-[10px] text-slate-400 mt-2">
            {{ formatFecha(h.fecha) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Sin historial -->
    <div *ngIf="!loading() && historial().length === 0" class="py-8 text-center">
      <p class="text-sm text-slate-400">No hay historial registrado para este ticket</p>
    </div>
  </div>
</div>`,
})
export class TicketTimelineComponent implements OnChanges {
  @Input() ticketId!: number;

  private ticketsService = inject(TicketsService);

  historial = signal<HistorialTicket[]>([]);
  loading   = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticketId'] && this.ticketId) {
      this.cargarHistorial();
    }
  }

  private cargarHistorial() {
    this.loading.set(true);
    this.ticketsService.getHistorial(this.ticketId).subscribe({
      next: (data) => {
        this.historial.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.loading.set(false);
      },
    });
  }

  getNodeClass(estado: string | undefined): string {
    switch (estado) {
      case 'Resuelto':   return 'bg-emerald-500';
      case 'En Proceso': return 'bg-amber-500';
      case 'Pendiente':  return 'bg-blue-500';
      case 'Cancelado':  return 'bg-red-500';
      default:           return 'bg-slate-400';
    }
  }

  getNodeIcon(estado: string | undefined): string {
    switch (estado) {
      case 'Resuelto':   return '✓';
      case 'En Proceso': return '▶';
      case 'Pendiente':  return '●';
      case 'Cancelado':  return '✕';
      default:           return '?';
    }
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    switch (estado) {
      case 'Resuelto':   return 'bg-emerald-100 text-emerald-700';
      case 'En Proceso': return 'bg-amber-100 text-amber-700';
      case 'Pendiente':  return 'bg-blue-100 text-blue-700';
      case 'Cancelado':  return 'bg-red-100 text-red-600';
      default:           return 'bg-slate-100 text-slate-600';
    }
  }

  getFirstChar(word: string): string {
    return word?.[0] || '';
  }

  formatFecha(isoString: string): string {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
