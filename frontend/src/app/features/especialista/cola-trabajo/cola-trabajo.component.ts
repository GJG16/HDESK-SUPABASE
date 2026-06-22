import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TicketsService } from '../../../services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { Ticket, PatchTicketDto, HistorialTicket } from '../../../models/helpdesk.models';
import {
  getPrioridadClass, getEstadoClass,
  getSemaforoSla, getSlaRowClass, getSlaIconClass, getSlaTextoSemaforo,
} from '../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-cola-trabajo',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TiempoRelativoPipe],
  template: `
<div class="space-y-5">
  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/especialista/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Cola de Trabajo</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Cola de Trabajo</h2>
      <p class="text-sm text-slate-400">Tickets asignados y disponibles en tu área · Semáforo SLA activo</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg">{{ colaActiva.length }} activos</span>
      <span class="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg animate-pulse" *ngIf="slaRiesgo > 0">🔴 {{ slaRiesgo }} en riesgo SLA</span>
    </div>
  </div>

  <!-- Controles -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <!-- Leyenda del semáforo SLA (Mejora 5) -->
    <div class="flex items-center gap-4 bg-slate-50 rounded-xl px-4 py-2.5">
      <span class="text-xs font-semibold text-slate-500">Semáforo SLA:</span>
      <span class="flex items-center gap-1.5 text-xs text-emerald-700"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> &lt; 1h</span>
      <span class="flex items-center gap-1.5 text-xs text-amber-700"><span class="w-2.5 h-2.5 bg-amber-400 rounded-full"></span> 1h – 4h</span>
      <span class="flex items-center gap-1.5 text-xs text-red-700"><span class="w-2.5 h-2.5 bg-red-500 rounded-full"></span> &gt; 4h (Alerta)</span>
    </div>

    <div class="flex items-center gap-2">
      <!-- Toggle vista -->
      <div class="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
        <button (click)="vistaActiva.set('tabla')" class="p-2 rounded-lg transition-all"
          [ngClass]="vistaActiva() === 'tabla' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
        </button>
        <button (click)="vistaActiva.set('kanban')" class="p-2 rounded-lg transition-all"
          [ngClass]="vistaActiva() === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
        </button>
      </div>
      <!-- Filtros -->
      <div class="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
        <button *ngFor="let f of filtros" (click)="filtroActivo.set(f.value)"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          [ngClass]="filtroActivo() === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
          {{ f.label }}
        </button>
      </div>
    </div>
  </div>

  <!-- ═══ VISTA TABLA ═══ -->
  <div *ngIf="vistaActiva() === 'tabla'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-[11px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="px-3 py-3.5 w-8">SLA</th>
            <th class="px-3 py-3.5">ID</th>
            <th class="px-5 py-3.5">Descripción</th>
            <th class="px-3 py-3.5">Origen</th>
            <th class="px-3 py-3.5">Prioridad</th>
            <th class="px-3 py-3.5">Estado</th>
            <th class="px-3 py-3.5">Tiempo</th>
            <th class="px-3 py-3.5">Operador</th>
            <th class="px-3 py-3.5">Creado</th>
            <th class="px-3 py-3.5 text-center">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr *ngFor="let t of ticketsFiltrados"
            (click)="verDetalle(t.id)"
            class="hover:bg-slate-50/50 transition-colors group cursor-pointer"
            [ngClass]="getSlaRow(t)">

            <!-- Semáforo SLA (Mejora 5) -->
            <td class="px-3 py-4">
              <span class="w-3.5 h-3.5 rounded-full block mx-auto"
                [ngClass]="{
                  'bg-emerald-500': getSemaforoSla(t) === 'verde',
                  'bg-amber-400 animate-pulse': getSemaforoSla(t) === 'amarillo',
                  'bg-red-500 animate-pulse': getSemaforoSla(t) === 'rojo'
                }"
                [title]="getSemaforoSla(t) === 'rojo' ? '⚠ ALERTA SLA: Más de 4h sin atención' : getSemaforoSla(t) === 'amarillo' ? 'Advertencia: Entre 1-4h' : 'OK: Menos de 1h'">
              </span>
            </td>

            <td class="px-3 py-4">
              <span class="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{{ t.id }}</span>
            </td>
            <td class="px-5 py-4 max-w-xs">
              <p class="font-medium text-slate-800 truncate">{{ t.titulo || t.descripcion }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ t.nombre_area }}</p>
            </td>

            <!-- Columna Origen (Mejora 3) -->
            <td class="px-3 py-4">
              <span *ngIf="t.nombre_departamento_origen"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
                🏢 {{ t.nombre_departamento_origen }}
              </span>
              <span *ngIf="!t.nombre_departamento_origen" class="text-xs text-slate-400">—</span>
            </td>

            <td class="px-3 py-4">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" [ngClass]="getPClass(t.criticidad)">
                <svg *ngIf="t.criticidad === 'Alta' || t.criticidad === 'Critica'" class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clip-rule="evenodd"/></svg>
                {{ t.criticidad }}
              </span>
            </td>
            <td class="px-3 py-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="getEClass(t.estado)">
                <span class="w-1.5 h-1.5 rounded-full bg-current" [class.animate-pulse]="t.estado === 'En Proceso'"></span>
                {{ t.estado }}
              </span>
            </td>
            <!-- Tiempo transcurrido con color del semáforo -->
            <td class="px-3 py-4">
              <span class="text-xs font-mono font-bold" [ngClass]="getSlaIcon(t)">{{ getSlaTexto(t) }}</span>
            </td>
            <td class="px-3 py-4 text-xs text-slate-500">{{ t.nombre_operador }}</td>
            <td class="px-3 py-4 text-xs text-slate-400">{{ t.fecha_creacion | tiempoRelativo }}</td>
            <td class="px-3 py-4 text-center">
              <div class="flex items-center justify-center gap-2">
                <!-- Tomar ticket (si está Pendiente) -->
                <button *ngIf="t.estado === 'Pendiente'"
                  (click)="tomarTicket(t); $event.stopPropagation()"
                  [disabled]="procesandoId() === t.id"
                  class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-emerald-500/20">
                  Tomar
                </button>
                <!-- Resolver ticket (si está En Proceso asignado a mí) -->
                <button *ngIf="t.estado === 'En Proceso' && t.id_especialista === userId"
                  (click)="abrirResolucion(t); $event.stopPropagation()"
                  class="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-blue-500/20">
                  Resolver
                </button>
              </div>
            </td>
          </tr>
          <tr *ngIf="ticketsFiltrados.length === 0">
            <td colspan="10" class="px-5 py-10 text-center text-sm text-slate-400">No hay tickets en esta categoría</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ VISTA KANBAN ═══ -->
  <div *ngIf="vistaActiva() === 'kanban'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div *ngFor="let col of kanbanColumns" class="bg-slate-50 rounded-2xl p-3 min-h-[300px]">
      <div class="flex items-center justify-between mb-3 px-1">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" [ngClass]="col.dotClass"></span>
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ col.label }}</h3>
        </div>
        <span class="bg-white text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{{ getKanbanTickets(col.value).length }}</span>
      </div>
      <div class="space-y-2">
        <div *ngFor="let t of getKanbanTickets(col.value)"
          (click)="verDetalle(t.id)"
          class="bg-white rounded-xl border border-slate-100 p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
          [ngClass]="getSlaRow(t)">
          
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-[10px] font-bold text-slate-400">#{{ t.id }}</span>
              <!-- Semáforo SLA -->
              <span class="w-2 h-2 rounded-full block"
                [ngClass]="{
                  'bg-emerald-500': getSemaforoSla(t) === 'verde',
                  'bg-amber-400 animate-pulse': getSemaforoSla(t) === 'amarillo',
                  'bg-red-500 animate-pulse': getSemaforoSla(t) === 'rojo'
                }"></span>
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" [ngClass]="getPClass(t.criticidad)">{{ t.criticidad }}</span>
          </div>
          
          <p class="text-xs font-semibold text-slate-800 line-clamp-2 mb-2">{{ t.titulo || t.descripcion }}</p>
          
          <div class="flex items-center justify-between mt-3">
            <span class="text-[10px] text-slate-400">{{ t.nombre_area }}</span>
            <div class="flex items-center gap-1">
              <button *ngIf="t.estado === 'Pendiente'"
                (click)="tomarTicket(t); $event.stopPropagation()"
                [disabled]="procesandoId() === t.id"
                class="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
                Tomar
              </button>
              <button *ngIf="t.estado === 'En Proceso' && t.id_especialista === userId"
                (click)="abrirResolucion(t); $event.stopPropagation()"
                class="px-2 py-1 bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
                Resolver
              </button>
            </div>
          </div>
        </div>
        <div *ngIf="getKanbanTickets(col.value).length === 0" class="text-center py-6 text-xs text-slate-300">
          Sin tickets
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de resolución -->
  <div *ngIf="ticketResolviendo()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="ticketResolviendo.set(null)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-base font-bold text-slate-900">Resolver Ticket #{{ ticketResolviendo()?.id }}</h3>
          <p class="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{{ ticketResolviendo()?.descripcion }}</p>
          <p *ngIf="ticketResolviendo()?.nombre_departamento_origen" class="text-xs text-indigo-600 mt-0.5">🏢 Origen: {{ ticketResolviendo()?.nombre_departamento_origen }}</p>
        </div>
        <button (click)="ticketResolviendo.set(null)" class="text-slate-400 hover:text-slate-600 p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form [formGroup]="resolucionForm" (ngSubmit)="confirmarResolucion()" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Comentario de Resolución <span class="text-red-500">*</span></label>
          <textarea formControlName="comentario" rows="4" placeholder="Describe el diagnóstico y la solución aplicada..."
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm outline-none resize-none transition-all"></textarea>
        </div>
        <div class="flex gap-3 pt-1">
          <button type="submit" [disabled]="resolucionForm.invalid || procesandoId() !== null"
            class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
            ✓ Marcar como Resuelto
          </button>
          <button type="button" (click)="ticketResolviendo.set(null)"
            class="px-5 py-3 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal de Timeline/Historial (Mejora 5) -->
  <div *ngIf="ticketTimeline()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="ticketTimeline.set(null)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-base font-bold text-slate-900">📋 Historial — Ticket #{{ ticketTimeline()?.id }}</h3>
          <p class="text-xs text-slate-500 mt-0.5">Línea de tiempo de cambios de estado</p>
        </div>
        <button (click)="ticketTimeline.set(null)" class="text-slate-400 hover:text-slate-600 p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Timeline visual -->
      <div class="relative ml-4">
        <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        <div *ngFor="let h of historialData(); let last = last" class="relative pl-10 pb-6" [class.pb-0]="last">
          <!-- Nodo del timeline -->
          <div class="absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
            [ngClass]="{
              'bg-emerald-500': h.estado_nuevo === 'Resuelto',
              'bg-amber-500': h.estado_nuevo === 'En Proceso',
              'bg-blue-500': h.estado_nuevo === 'Pendiente',
              'bg-red-500': h.estado_nuevo === 'Cancelado',
              'bg-slate-400': !h.estado_nuevo
            }">
            <span *ngIf="h.estado_nuevo === 'Resuelto'">✓</span>
            <span *ngIf="h.estado_nuevo === 'En Proceso'">▶</span>
            <span *ngIf="h.estado_nuevo === 'Pendiente'">●</span>
            <span *ngIf="h.estado_nuevo === 'Cancelado'">✕</span>
          </div>
          <!-- Contenido -->
          <div class="bg-slate-50 rounded-xl p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">
                {{ h.estado_anterior ? h.estado_anterior + ' → ' : '' }}{{ h.estado_nuevo }}
              </span>
              <span class="text-[10px] text-slate-400">{{ h.fecha | tiempoRelativo }}</span>
            </div>
            <p *ngIf="h.nombre_usuario" class="text-xs text-slate-500 mt-1">👤 {{ h.nombre_usuario }}</p>
            <p *ngIf="h.comentario" class="text-xs text-slate-600 mt-1 italic">{{ h.comentario }}</p>
          </div>
        </div>
        <div *ngIf="historialData().length === 0" class="pl-10 py-4 text-sm text-slate-400">
          No hay historial registrado
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class ColaTrabajoComponent implements OnInit {
  auth    = inject(AuthService);
  tickets = inject(TicketsService);
  toast   = inject(ToastService);
  fb      = inject(FormBuilder);
  router  = inject(Router);

  cola              = signal<Ticket[]>([]);
  filtroActivo      = signal('todos');
  vistaActiva       = signal<'tabla' | 'kanban'>('tabla');
  procesandoId      = signal<number | null>(null);
  ticketResolviendo = signal<Ticket | null>(null);
  ticketTimeline    = signal<Ticket | null>(null);
  historialData     = signal<HistorialTicket[]>([]);

  filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pendientes', value: 'Pendiente' },
    { label: 'En Proceso', value: 'En Proceso' },
  ];

  kanbanColumns = [
    { label: 'Pendiente',  value: 'Pendiente',  dotClass: 'bg-slate-400' },
    { label: 'En Proceso', value: 'En Proceso', dotClass: 'bg-amber-400' },
    { label: 'Resuelto',   value: 'Resuelto',   dotClass: 'bg-emerald-500' },
    { label: 'Cancelado',  value: 'Cancelado',  dotClass: 'bg-red-500' },
  ];

  resolucionForm = this.fb.group({
    comentario: ['', [Validators.required, Validators.minLength(10)]],
  });

  get userId() { return this.auth.currentUser()?.id; }
  get colaActiva() { return this.cola().filter(t => t.estado !== 'Resuelto' && t.estado !== 'Cancelado'); }
  get slaRiesgo()  { return this.cola().filter(t => getSemaforoSla(t) === 'rojo').length; }

  get ticketsFiltrados() {
    const f = this.filtroActivo();
    return f === 'todos' ? this.cola() : this.cola().filter(t => t.estado === f);
  }

  getKanbanTickets(estado: string): Ticket[] {
    return this.cola().filter(t => t.estado === estado);
  }

  ngOnInit() {
    this.tickets.getTodos().subscribe(ts => this.cola.set(ts));
  }

  verDetalle(id: number) {
    this.router.navigate(['/especialista/tickets', id]);
  }

  tomarTicket(t: Ticket) {
    this.procesandoId.set(t.id);
    const patch: PatchTicketDto = {
      estado: 'En Proceso',
      id_especialista: this.userId,
      version: t.version,
    };
    this.tickets.actualizarTicket(t.id, patch).subscribe({
      next: (updated) => {
        this.cola.update(ts => ts.map(x => x.id === updated.id ? updated : x));
        this.toast.success('Ticket tomado', `#${t.id} ahora está en proceso`);
        this.procesandoId.set(null);
      },
      error: () => { this.procesandoId.set(null); this.toast.error('Error', 'No se pudo tomar el ticket'); },
    });
  }

  abrirResolucion(t: Ticket) {
    this.ticketResolviendo.set(t);
    this.resolucionForm.reset();
  }

  confirmarResolucion() {
    const t = this.ticketResolviendo();
    if (!t || this.resolucionForm.invalid) return;
    this.procesandoId.set(t.id);
    const patch: PatchTicketDto = {
      estado: 'Resuelto',
      comentario_resolucion: this.resolucionForm.value.comentario!,
      id_especialista: this.userId,
      version: t.version,
    };
    this.tickets.actualizarTicket(t.id, patch).subscribe({
      next: (updated) => {
        this.cola.update(ts => ts.map(x => x.id === updated.id ? updated : x));
        this.toast.success('¡Resuelto!', `Ticket #${t.id} marcado como resuelto`);
        this.ticketResolviendo.set(null);
        this.procesandoId.set(null);
      },
      error: () => { this.procesandoId.set(null); this.toast.error('Error', 'No se pudo resolver'); },
    });
  }

  verTimeline(t: Ticket) {
    this.ticketTimeline.set(t);
    this.historialData.set([]);
    this.tickets.getHistorial(t.id).subscribe({
      next: (data) => this.historialData.set(data),
      error: () => this.historialData.set([]),
    });
  }

  // Delegamos a utilidades compartidas
  getSemaforoSla = getSemaforoSla;
  getSlaRow      = getSlaRowClass;
  getSlaIcon     = getSlaIconClass;
  getSlaTexto    = getSlaTextoSemaforo;
  getPClass      = getPrioridadClass;
  getEClass      = getEstadoClass;
}
