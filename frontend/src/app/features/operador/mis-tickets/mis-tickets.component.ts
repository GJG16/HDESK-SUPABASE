import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketsService } from '../../../services/tickets.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { Ticket, EstadoTicket, PrioridadTicket } from '../../../models/helpdesk.models';
import {
  getPrioridadClass, getEstadoClass,
  getSlaRowClass, getSemaforoSla, getSlaIconClass, getSlaTextoSemaforo
} from '../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-mis-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule, TiempoRelativoPipe],
  template: `
<div class="space-y-5">
  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/operador/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Mis Tickets</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Mis Tickets</h2>
      <p class="text-sm text-slate-400">Todos los tickets que has registrado</p>
    </div>
    <!-- Controles -->
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
      <div class="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
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
            <th class="px-5 py-3.5">ID</th>
            <th class="px-5 py-3.5">Descripción</th>
            <th class="px-5 py-3.5">Área</th>
            <th class="px-5 py-3.5">Criticidad</th>
            <th class="px-5 py-3.5">Estado</th>
            <th class="px-5 py-3.5">Técnico Asignado</th>
            <th class="px-5 py-3.5">Creado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <ng-container *ngIf="!isLoading(); else skeleton">
            <tr *ngFor="let t of ticketsFiltrados"
              (click)="verDetalle(t.id)"
              class="hover:bg-blue-50/20 transition-colors group cursor-pointer"
              [ngClass]="getSlaRowClass(t)">
              <td class="px-5 py-4">
                <span class="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{{ t.id }}</span>
              </td>
              <td class="px-5 py-4 max-w-xs">
                <p class="font-medium text-slate-800 truncate">{{ t.descripcion }}</p>
              </td>
              <td class="px-5 py-4 text-xs text-slate-600">{{ t.nombre_area }}</td>
              <td class="px-5 py-4">
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold" [ngClass]="getPClass(t.criticidad)">{{ t.criticidad }}</span>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="getEClass(t.estado)">
                  <span class="w-1.5 h-1.5 rounded-full bg-current" [class.animate-pulse]="t.estado === 'En Proceso'"></span>
                  {{ t.estado }}
                </span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-500">
                <span *ngIf="t.nombre_especialista" class="flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 flex items-center justify-center">{{ t.nombre_especialista.charAt(0) }}</span>
                  {{ t.nombre_especialista }}
                </span>
                <span *ngIf="!t.nombre_especialista" class="text-slate-400">Sin asignar</span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400">{{ t.fecha_creacion | tiempoRelativo }}</td>
            </tr>
            <tr *ngIf="ticketsFiltrados.length === 0">
              <td colspan="7" class="px-5 py-10 text-center">
                <p class="text-slate-400 text-sm">No hay tickets en esta categoría</p>
              </td>
            </tr>
          </ng-container>
          <ng-template #skeleton>
            <tr *ngFor="let i of [1,2,3,4,5]">
              <td colspan="7" class="px-5 py-4"><div class="h-6 bg-slate-200 rounded-lg animate-pulse"></div></td>
            </tr>
          </ng-template>
        </tbody>
      </table>
    </div>
    <!-- Footer -->
    <div class="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
      <span>Mostrando <strong class="text-slate-700">{{ ticketsFiltrados.length }}</strong> tickets</span>
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
          class="bg-white rounded-xl border border-slate-100 p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] font-bold text-slate-400">#{{ t.id }}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" [ngClass]="getPClass(t.criticidad)">{{ t.criticidad }}</span>
          </div>
          <p class="text-xs font-semibold text-slate-800 line-clamp-2 mb-2">{{ t.titulo || t.descripcion }}</p>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-400">{{ t.nombre_area }}</span>
            <div *ngIf="t.nombre_especialista" class="w-5 h-5 rounded-full bg-slate-200 text-[8px] font-bold text-slate-600 flex items-center justify-center"
              [title]="t.nombre_especialista">
              {{ t.nombre_especialista.charAt(0) }}
            </div>
          </div>
        </div>
        <div *ngIf="getKanbanTickets(col.value).length === 0" class="text-center py-6 text-xs text-slate-300">
          Sin tickets
        </div>
      </div>
    </div>
  </div>

</div>`,
})
export class MisTicketsComponent implements OnInit {
  auth    = inject(AuthService);
  tickets = inject(TicketsService);
  router  = inject(Router);

  allTickets = signal<Ticket[]>([]);
  isLoading  = signal(true);
  filtroActivo = signal('todos');
  vistaActiva = signal<'tabla' | 'kanban'>('tabla');

  filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En Proceso', value: 'En Proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
  ];

  kanbanColumns = [
    { label: 'Pendiente',  value: 'Pendiente',  dotClass: 'bg-slate-400' },
    { label: 'En Proceso', value: 'En Proceso', dotClass: 'bg-amber-400' },
    { label: 'Resuelto',   value: 'Resuelto',   dotClass: 'bg-emerald-500' },
    { label: 'Cancelado',  value: 'Cancelado',  dotClass: 'bg-red-500' },
  ];

  get ticketsFiltrados() {
    const f = this.filtroActivo();
    return f === 'todos' ? this.allTickets() : this.allTickets().filter(t => t.estado === f);
  }

  getKanbanTickets(estado: string): Ticket[] {
    return this.allTickets().filter(t => t.estado === estado);
  }

  ngOnInit() {
    const uid = this.auth.currentUser()?.id ?? 0;
    this.tickets.getTodos().subscribe((ts: Ticket[]) => {
      const misTickets = ts.filter(t => t.id_operador_creador === uid);
      this.allTickets.set(misTickets);
      this.isLoading.set(false);
    });
  }

  verDetalle(id: number) {
    this.router.navigate(['/operador/tickets', id]);
  }

  getPClass = getPrioridadClass;
  getEClass = getEstadoClass;
  getSlaRowClass = getSlaRowClass;
  getSemaforoSla = getSemaforoSla;
  getSlaIconClass = getSlaIconClass;
  getSlaTextoSemaforo = getSlaTextoSemaforo;
}
