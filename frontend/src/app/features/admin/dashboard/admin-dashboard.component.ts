import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { DashboardService } from '../../../services/dashboard.service';
import { TicketsService } from '../../../services/tickets.service';
import { Ticket, Usuario, DashboardMetrics, PrioridadTicket, EstadoTicket } from '../../../models/helpdesk.models';
import {
  getPrioridadBadge, getEstadoBadge,
  getTrendClass, getTrendSign, getCargaBarClass, getAvatarInitials
} from '../../../shared/utils/badge-helpers';

interface UI_TicketPorArea {
  area: string;
  cantidad: number;
  porcentaje: number;
}

interface UI_Tecnico extends Usuario {
  carga_trabajo: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
<div class="space-y-6">

  <!-- Breadcrumb / contexto -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 text-sm text-slate-400">
      <span class="font-medium text-slate-700">Inicio</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      <span class="font-semibold text-[#2563EB]">Dashboard</span>
    </div>
    <span class="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
      Última actualización: hoy, {{ currentTime | date:'HH:mm' }}
    </span>
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
    <!-- KPI 1 -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-1 transition-transform group">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Tickets</p>
          <p class="text-3xl font-extrabold text-slate-900">
            <span *ngIf="isLoading" class="animate-pulse bg-slate-200 w-16 h-8 inline-block rounded-lg"></span>
            <span *ngIf="!isLoading">{{ totalTickets }}</span>
          </p>
          <p class="text-xs font-semibold mt-1 text-slate-500">En todo el sistema</p>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
      </div>
    </div>

    <!-- KPI 2 -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-1 transition-transform group">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">T. Promedio Resolución</p>
          <p class="text-3xl font-extrabold text-slate-900">
            <span *ngIf="isLoading" class="animate-pulse bg-slate-200 w-16 h-8 inline-block rounded-lg"></span>
            <span *ngIf="!isLoading">{{ tiempoPromedio }} hrs</span>
          </p>
          <p class="text-xs font-semibold mt-1 text-slate-500">Promedio global histórico</p>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
      </div>
    </div>

    <!-- KPI 3 -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-1 transition-transform group">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Carga Prom. por Técnico</p>
          <p class="text-3xl font-extrabold text-slate-900">
            <span *ngIf="isLoading" class="animate-pulse bg-slate-200 w-16 h-8 inline-block rounded-lg"></span>
            <span *ngIf="!isLoading">{{ cargaPromedio }} <span class="text-lg font-medium text-slate-400">tickets</span></span>
          </p>
          <p class="text-xs font-semibold mt-1 text-slate-500">Tickets activos por especialista</p>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
    <!-- Gráfico Barras -->
    <div class="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h3 class="text-base font-bold text-slate-900">Tickets por Área Técnica</h3>
          <p class="text-xs text-slate-400 mt-0.5">Distribución calculada por el motor de análisis</p>
        </div>
      </div>
      <div *ngIf="isLoading" class="h-52 flex items-center justify-center"><div class="animate-pulse bg-slate-200 w-full h-full rounded-xl"></div></div>
      <div *ngIf="!isLoading" class="relative">
        <div class="absolute inset-x-0 top-0 h-52 flex flex-col justify-between pointer-events-none">
          <div class="border-t border-dashed border-slate-100 flex items-center"><span class="text-[10px] text-slate-300 -mt-2.5 pr-2 bg-white">100%</span></div>
          <div class="border-t border-dashed border-slate-100 flex items-center"><span class="text-[10px] text-slate-300 -mt-2.5 pr-2 bg-white">50%</span></div>
          <div class="border-t border-slate-200 flex items-center"><span class="text-[10px] text-slate-300 -mt-2.5 pr-2 bg-white">0%</span></div>
        </div>
        <div class="h-52 flex items-end justify-around gap-3 pl-8 pb-1 relative z-10">
          <div *ngFor="let item of ticketsPorArea" class="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer" (mouseenter)="onBarHover(item)" (mouseleave)="onBarHover(null)">
            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none mb-1">
              <span class="font-semibold">{{ item.cantidad }}</span> tickets · {{ item.porcentaje }}%
            </div>
            <div class="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden" [style.height]="item.porcentaje + '%'" style="min-height: 8px;"
              [class]="item.porcentaje >= 75 ? 'bg-[#2563EB]' : item.porcentaje >= 50 ? 'bg-blue-400' : 'bg-blue-200'">
              <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-150"></div>
            </div>
          </div>
        </div>
        <div class="flex justify-around mt-3 pl-8 gap-3">
          <div *ngFor="let item of ticketsPorArea" class="flex-1 text-center">
            <p class="text-[11px] font-semibold text-slate-600 truncate">{{ item.area }}</p>
            <p class="text-[10px] text-slate-400">{{ item.cantidad }} tkts</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Técnicos -->
    <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-base font-bold text-slate-900">Carga por Técnico</h3>
          <p class="text-xs text-slate-400 mt-0.5">Tickets activos asignados</p>
        </div>
        <span class="text-xs font-semibold bg-blue-50 text-[#2563EB] px-2.5 py-1 rounded-lg">En línea: {{ tecnicos.length }}</span>
      </div>
      <div class="space-y-4">
        <div *ngIf="isLoading"><div *ngFor="let i of [1,2,3,4,5]" class="animate-pulse bg-slate-200 h-12 rounded-xl mb-3"></div></div>
        <div *ngFor="let tecnico of tecnicos" class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
          <div class="w-9 h-9 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">{{ getAvatar(tecnico) }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-semibold text-slate-800 truncate">{{ tecnico.nombre }}</p>
              <span class="text-xs font-bold text-slate-600 ml-2">{{ tecnico.carga_trabajo }} tkts</span>
            </div>
            <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" [ngClass]="getCargaBarClass(tecnico.carga_trabajo)" [style.width]="(tecnico.carga_trabajo * 10) + '%'"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5">{{ tecnico.especialidad || tecnico.nombre_area_tecnica || 'Soporte' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Matriz -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-slate-900">Matriz de Tickets Críticos</h3>
        <p class="text-xs text-slate-400 mt-0.5">Atención inmediata requerida</p>
      </div>
      <button (click)="loadDashboardData()" class="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
        Recargar
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="px-6 py-3.5">ID</th>
            <th class="px-6 py-3.5">Descripción</th>
            <th class="px-6 py-3.5">Criticidad</th>
            <th class="px-6 py-3.5">Estado</th>
            <th class="px-6 py-3.5">Fecha</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <ng-container *ngIf="isLoading"><tr *ngFor="let i of [1,2,3,4]"><td colspan="5" class="px-6 py-4"><div class="animate-pulse bg-slate-200 h-6 rounded-lg"></div></td></tr></ng-container>
          <tr *ngFor="let ticket of ticketsCriticos" class="hover:bg-blue-50/30 transition-colors cursor-pointer" [ngClass]="{'bg-red-50': ticket.criticidad === 'Alta' && ticket.estado === 'Pendiente'}">
            <td class="px-6 py-4"><span class="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">#{{ ticket.id }}</span></td>
            <td class="px-6 py-4 max-w-xs"><p class="font-semibold text-slate-800 truncate">{{ ticket.descripcion }}</p></td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" [ngClass]="getPrioridadBadge(ticket.criticidad)">
                {{ ticket.criticidad }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" [ngClass]="getEstadoBadge(ticket.estado)">
                <span class="w-1.5 h-1.5 rounded-full bg-current" [class.animate-pulse]="ticket.estado === 'En Proceso'"></span>
                {{ ticket.estado }}
              </span>
            </td>
            <td class="px-6 py-4"><p class="text-sm text-slate-600 font-medium">{{ formatFecha(ticket.fecha_creacion) }}</p></td>
          </tr>
          <tr *ngIf="!isLoading && ticketsCriticos.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-sm text-slate-400">Excelente, no hay tickets críticos en este momento.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
  `
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  dashboardService = inject(DashboardService);
  ticketsService = inject(TicketsService);
  private destroy$ = new Subject<void>();

  isLoading = true;
  currentTime = new Date();
  hoveredBar: UI_TicketPorArea | null = null;

  totalTickets = 0;
  tiempoPromedio = 0;
  cargaPromedio = 0;
  
  ticketsPorArea: UI_TicketPorArea[] = [];
  ticketsCriticos: Ticket[] = [];
  tecnicos: UI_Tecnico[] = [];

  ngOnInit() { this.loadDashboardData(); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadDashboardData() {
    this.isLoading = true;
    forkJoin({
      metrics: this.dashboardService.getDashboard(),
      rendimiento: this.dashboardService.getRendimiento(),
      ticketsCriticos: this.ticketsService.getCriticosPendientes(),
      tecnicos: this.dashboardService.getUsuarios('Tecnico', true),
      todos: this.ticketsService.getTodos(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.totalTickets = data.metrics.total_tickets;
        this.tiempoPromedio = data.rendimiento.metricas_globales.promedio_global_horas;
        
        // Calcular carga promedio
        let totalAsignados = 0;
        
        // Mapear áreas
        const maxArea = Math.max(...Object.values(data.metrics.por_area as Record<string, number>), 1);
        this.ticketsPorArea = Object.keys(data.metrics.por_area).map(area => {
          const qty = data.metrics.por_area[area];
          return {
            area: area,
            cantidad: qty,
            porcentaje: Math.round((qty / maxArea) * 100)
          };
        });

        // Mapear tecnicos
        this.tecnicos = data.tecnicos.map((t: Usuario) => {
          const carga = data.todos.filter((tk: Ticket) => tk.id_especialista === t.id && tk.estado !== 'Resuelto' && tk.estado !== 'Cancelado').length;
          totalAsignados += carga;
          return { ...t, carga_trabajo: carga };
        });

        this.cargaPromedio = data.tecnicos.length > 0 ? parseFloat((totalAsignados / data.tecnicos.length).toFixed(1)) : 0;
        this.ticketsCriticos = data.ticketsCriticos;
        
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  getEstadoBadge  = getEstadoBadge;
  getPrioridadBadge = getPrioridadBadge;
  getTrendClass = getTrendClass;
  getTrendSign  = getTrendSign;
  getCargaBarClass = getCargaBarClass;
  onBarHover(item: UI_TicketPorArea | null) { this.hoveredBar = item; }

  formatFecha(isoString: string): string {
    if(!isoString) return '';
    return new Date(isoString).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  getAvatar(tecnico: UI_Tecnico): string {
    return getAvatarInitials(tecnico.nombre || tecnico.especialidad || '?');
  }
}
