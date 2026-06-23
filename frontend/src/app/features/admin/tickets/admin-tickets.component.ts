import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketsService } from '../../../services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { Ticket, EstadoTicket, PrioridadTicket } from '../../../models/helpdesk.models';
import {
  getPrioridadClass, getEstadoClass,
  getSlaRowClass, getSemaforoSla, getSlaIconClass, getSlaTextoSemaforo
} from '../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TiempoRelativoPipe],
  template: `
<div class="space-y-5">

  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Todos los Tickets</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Todos los Tickets</h2>
      <p class="text-sm text-slate-400">Gestión global de todos los tickets del sistema</p>
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
      <button (click)="reload()" class="flex items-center gap-1.5 px-4 py-2 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Actualizar
      </button>
    </div>
  </div>

  <!-- Barra de búsqueda + Filtros -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative flex-1 min-w-[200px] max-w-md">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)"
        placeholder="Buscar por ID, título o descripción..."
        class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all">
    </div>
    <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button *ngFor="let f of filtrosEstado" (click)="filtroEstado.set(f.value)"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        [ngClass]="filtroEstado() === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
        {{ f.label }}
      </button>
    </div>
    <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button *ngFor="let f of filtrosPrioridad" (click)="filtroPrioridad.set(f.value)"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        [ngClass]="filtroPrioridad() === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
        {{ f.label }}
      </button>
    </div>
  </div>

  <!-- ═══ VISTA TABLA ═══ -->
  <div *ngIf="vistaActiva() === 'tabla'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-[11px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="px-5 py-3.5 cursor-pointer hover:text-slate-700 select-none" (click)="toggleSort('id')">
              ID <span *ngIf="sortBy() === 'id'">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-5 py-3.5 cursor-pointer hover:text-slate-700 select-none" (click)="toggleSort('titulo')">
              Descripción <span *ngIf="sortBy() === 'titulo'">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-5 py-3.5">Prioridad</th>
            <th class="px-5 py-3.5">Tipo</th>
            <th class="px-5 py-3.5">Estado</th>
            <th class="px-5 py-3.5">Área</th>
            <th class="px-5 py-3.5">Operador</th>
            <th class="px-5 py-3.5">Técnico</th>
            <th class="px-5 py-3.5">SLA</th>
            <th class="px-5 py-3.5 cursor-pointer hover:text-slate-700 select-none" (click)="toggleSort('fecha_creacion')">
              Creado <span *ngIf="sortBy() === 'fecha_creacion'">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-5 py-3.5 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <ng-container *ngIf="!isLoading(); else skeleton">
            <tr *ngFor="let t of paginatedTickets"
              class="hover:bg-blue-50/20 transition-colors group cursor-pointer"
              [ngClass]="getSlaRowClass(t)"
              (click)="verDetalle(t.id)">
              <td class="px-5 py-4"><span class="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{{ t.id }}</span></td>
              <td class="px-5 py-4 max-w-xs"><p class="font-medium text-slate-800 truncate">{{ t.titulo || t.descripcion }}</p></td>
              <td class="px-5 py-4"><span class="px-2 py-0.5 rounded-md text-xs font-semibold" [ngClass]="getPClass(t.criticidad)">{{ t.criticidad }}</span></td>
              <td class="px-5 py-4 text-xs text-slate-500 font-medium">{{ t.tipo_solicitud }}</td>
              <td class="px-5 py-4">
                <select class="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer outline-none transition-colors"
                  [ngClass]="getEClass(t.estado)"
                  [value]="t.estado"
                  (click)="$event.stopPropagation()"
                  (change)="cambiarEstado(t, $event)">
                  <option *ngFor="let e of estados" [value]="e">{{ e }}</option>
                </select>
              </td>
              <td class="px-5 py-4 text-xs text-slate-600">{{ t.nombre_area }}</td>
              <td class="px-5 py-4 text-xs text-slate-500">{{ t.nombre_operador }}</td>
              <td class="px-5 py-4 text-xs text-slate-500">{{ t.nombre_especialista || '—' }}</td>
              <td class="px-5 py-4 w-24">
                <div *ngIf="t.estado !== 'Resuelto'">
                  <p class="text-[10px] mt-0.5" [ngClass]="getSlaIconClass(t)">{{ getSlaTextoSemaforo(t) }}</p>
                </div>
                <span *ngIf="t.estado === 'Resuelto'" class="text-xs text-slate-300">—</span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400">{{ t.fecha_creacion | tiempoRelativo }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button (click)="$event.stopPropagation(); verDetalle(t.id)" title="Ver detalle"
                    class="p-1.5 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                  <button (click)="$event.stopPropagation(); confirmarEliminar(t)" title="Eliminar"
                    class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="ticketsFiltrados.length === 0">
              <td colspan="10" class="px-5 py-12 text-center">
                <svg class="w-12 h-12 mx-auto text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-sm text-slate-400 font-medium">No hay tickets con estos filtros</p>
                <p class="text-xs text-slate-300 mt-1">Intenta ajustar los filtros o la búsqueda</p>
              </td>
            </tr>
          </ng-container>
          <ng-template #skeleton>
            <tr *ngFor="let i of [1,2,3,4,5,6]">
              <td colspan="10" class="px-5 py-4"><div class="h-5 bg-slate-200 rounded-lg animate-pulse"></div></td>
            </tr>
          </ng-template>
        </tbody>
      </table>
    </div>
    <!-- Paginación -->
    <div class="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
      <span>Mostrando <strong class="text-slate-700">{{ paginatedTickets.length }}</strong> de {{ ticketsFiltrados.length }} tickets</span>
      <div class="flex items-center gap-1" *ngIf="totalPages > 1">
        <button (click)="currentPage.set(currentPage() - 1)" [disabled]="currentPage() <= 1"
          class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Anterior</button>
        <ng-container *ngFor="let p of pageNumbers">
          <button (click)="currentPage.set(p)"
            class="w-8 h-8 rounded-lg text-xs font-bold transition-all"
            [ngClass]="currentPage() === p ? 'bg-[#2563EB] text-white' : 'hover:bg-white border border-slate-200'">{{ p }}</button>
        </ng-container>
        <button (click)="currentPage.set(currentPage() + 1)" [disabled]="currentPage() >= totalPages"
          class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Siguiente →</button>
      </div>
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
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-[10px] font-bold text-slate-400">#{{ t.id }}</span>
              <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{{ t.tipo_solicitud === 'Incidente' ? '🔥 INC' : '📦 PET' }}</span>
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" [ngClass]="getPClass(t.criticidad)">
              {{ t.criticidad }}
            </span>
          </div>
          <p class="text-xs font-semibold text-slate-800 line-clamp-2 mb-2">{{ t.titulo || t.descripcion }}</p>
          <div *ngIf="t.criticidad === 'Critica' && t.estado === 'Pendiente'" class="mb-2 bg-red-100 border border-red-200 text-red-700 text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            SLA VENCIDO
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-400">{{ t.nombre_area }}</span>
            <div *ngIf="t.nombre_especialista" class="w-5 h-5 rounded-full bg-slate-200 text-[8px] font-bold text-slate-600 flex items-center justify-center"
              [title]="t.nombre_especialista">
              {{ t.nombre_especialista.charAt(0) }}
            </div>
          </div>
          <div *ngIf="t.estado !== 'Resuelto' && t.estado !== 'Cancelado'" class="mt-2 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full"
              [ngClass]="{
                'bg-emerald-500': getSemaforoSla(t) === 'verde',
                'bg-amber-400 animate-pulse': getSemaforoSla(t) === 'amarillo',
                'bg-red-500 animate-pulse': getSemaforoSla(t) === 'rojo'
              }"></span>
            <span class="text-[10px] font-mono" [ngClass]="getSlaIconClass(t)">{{ getSlaTextoSemaforo(t) }}</span>
          </div>
        </div>
        <div *ngIf="getKanbanTickets(col.value).length === 0" class="text-center py-6 text-xs text-slate-300">
          Sin tickets
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal de confirmación de eliminación (reemplaza confirm() nativo) -->
<div *ngIf="ticketAEliminar()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="ticketAEliminar.set(null)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in" (click)="$event.stopPropagation()">
    <div class="text-center">
      <div class="w-14 h-14 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </div>
      <h3 class="text-base font-bold text-slate-900 mb-1">¿Eliminar ticket?</h3>
      <p class="text-sm text-slate-500 mb-1">#{{ ticketAEliminar()?.id }} — {{ ticketAEliminar()?.titulo }}</p>
      <p class="text-xs text-slate-400 mb-5">Esta acción se registrará en auditoría y no se puede deshacer.</p>
      <div class="flex gap-3">
        <button (click)="ejecutarEliminar()"
          class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors">
          Sí, eliminar
        </button>
        <button (click)="ticketAEliminar.set(null)"
          class="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</div>`,
})
export class AdminTicketsComponent implements OnInit {
  ticketsSvc = inject(TicketsService);
  toast      = inject(ToastService);
  router     = inject(Router);
  allTickets = signal<Ticket[]>([]);
  isLoading  = signal(true);
  filtroEstado    = signal('Todos');
  filtroPrioridad = signal('Todas');
  searchQuery = '';
  searchTimeout: any = null;
  vistaActiva = signal<'tabla' | 'kanban'>('tabla');
  sortBy      = signal('fecha_creacion');
  sortOrder   = signal<'asc' | 'desc'>('desc');
  currentPage = signal(1);
  pageSize    = 15;
  ticketAEliminar = signal<Ticket | null>(null);

  estados = Object.values(EstadoTicket);

  filtrosEstado    = [{ label: 'Todos', value: 'Todos' }, ...Object.values(EstadoTicket).map(v => ({ label: v, value: v }))];
  filtrosPrioridad = [{ label: 'Todas', value: 'Todas' }, ...Object.values(PrioridadTicket).map(v => ({ label: v, value: v }))];

  kanbanColumns = [
    { label: 'Pendiente',  value: 'Pendiente',  dotClass: 'bg-slate-400' },
    { label: 'En Proceso', value: 'En Proceso', dotClass: 'bg-amber-400' },
    { label: 'Resuelto',   value: 'Resuelto',   dotClass: 'bg-emerald-500' },
    { label: 'Cancelado',  value: 'Cancelado',  dotClass: 'bg-red-500' },
  ];

  get ticketsFiltrados() {
    let filtered = this.allTickets().filter(t => {
      const eOk = this.filtroEstado() === 'Todos' || t.estado === this.filtroEstado();
      const pOk = this.filtroPrioridad() === 'Todas' || t.criticidad === this.filtroPrioridad();
      return eOk && pOk;
    });
    // Client-side sorting
    const key = this.sortBy() as keyof Ticket;
    filtered.sort((a, b) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return this.sortOrder() === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }

  get totalPages() {
    return Math.ceil(this.ticketsFiltrados.length / this.pageSize);
  }

  get paginatedTickets() {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.ticketsFiltrados.slice(start, start + this.pageSize);
  }

  get pageNumbers() {
    const total = this.totalPages;
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getKanbanTickets(estado: string): Ticket[] {
    return this.allTickets().filter(t => t.estado === estado);
  }

  ngOnInit() { this.reload(); }

  reload() {
    this.isLoading.set(true);
    const q = this.searchQuery.trim() || undefined;
    this.ticketsSvc.getTodos(undefined, undefined, undefined, q).subscribe(ts => {
      this.allTickets.set(ts);
      this.isLoading.set(false);
    });
  }

  onSearch(query: string) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.reload();
    }, 400);
  }

  toggleSort(column: string) {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
  }

  verDetalle(id: number) {
    this.router.navigate(['/admin/tickets', id]);
  }

  cambiarEstado(t: Ticket, event: Event) {
    const nuevo = (event.target as HTMLSelectElement).value as EstadoTicket;
    this.ticketsSvc.actualizarTicket(t.id, { estado: nuevo }).subscribe({
      next: (updated: Ticket) => {
        this.allTickets.update(ts => ts.map(x => x.id === updated.id ? updated : x));
        this.toast.success('Estado actualizado', `#${t.id} → ${nuevo}`);
      },
    });
  }

  confirmarEliminar(t: Ticket) {
    this.ticketAEliminar.set(t);
  }

  ejecutarEliminar() {
    const t = this.ticketAEliminar();
    if (!t) return;
    this.ticketsSvc.eliminarTicket(t.id).subscribe(() => {
      this.allTickets.update(ts => ts.filter(x => x.id !== t.id));
      this.toast.success('Ticket eliminado', `#${t.id} fue eliminado del sistema`);
      this.ticketAEliminar.set(null);
    });
  }

  // Delegamos a utilidades compartidas
  getSlaRowClass = getSlaRowClass;
  getSemaforoSla = getSemaforoSla;
  getSlaIconClass = getSlaIconClass;
  getSlaTextoSemaforo = getSlaTextoSemaforo;
  getPClass = getPrioridadClass;
  getEClass = getEstadoClass;
}
