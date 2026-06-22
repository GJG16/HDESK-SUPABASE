import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketsService } from '../../../services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { Ticket, EstadoTicket, PrioridadTicket } from '../../../models/helpdesk.models';
import { getPrioridadClass, getEstadoClass } from '../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-operador-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, TiempoRelativoPipe],
  template: `
<div class="space-y-6">

  <!-- Bienvenida -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Buenos días, {{ getFirstName() }} 👋</h2>
      <p class="text-sm text-slate-500 mt-0.5">Extensión: <span class="font-semibold text-slate-700">{{ user()?.extension }}</span></p>
    </div>
    <a routerLink="/operador/nuevo-ticket"
      class="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Crear Nuevo Ticket
    </a>
  </div>

  <!-- KPIs personales -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mis Tickets Abiertos</p>
      <p class="text-3xl font-extrabold text-slate-900">{{ misTickets().length }}</p>
      <p class="text-xs text-slate-400 mt-1">Activos en este momento</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resueltos Esta Semana</p>
      <p class="text-3xl font-extrabold text-emerald-600">{{ ticketsResueltos }}</p>
      <p class="text-xs text-slate-400 mt-1">Cerrados exitosamente</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ticket más Antiguo</p>
      <p class="text-3xl font-extrabold" [ngClass]="ticketMasAntiguo ? 'text-amber-600' : 'text-slate-400'">
        {{ ticketMasAntiguo ? (ticketMasAntiguo.fecha_creacion | tiempoRelativo) : '—' }}
      </p>
      <p class="text-xs text-slate-400 mt-1">Sin resolver</p>
    </div>
  </div>

  <!-- Tabla de mis tickets recientes -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-slate-900">Mis Tickets Recientes</h3>
        <p class="text-xs text-slate-400 mt-0.5">Últimos tickets creados por ti</p>
      </div>
      <a routerLink="/operador/mis-tickets" class="text-xs text-[#2563EB] font-semibold hover:underline">Ver todos →</a>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-[11px] uppercase font-semibold text-slate-500 tracking-wider bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="px-5 py-3">ID</th>
            <th class="px-5 py-3">Descripción</th>
            <th class="px-5 py-3">Área</th>
            <th class="px-5 py-3">Criticidad</th>
            <th class="px-5 py-3">Estado</th>
            <th class="px-5 py-3">Técnico</th>
            <th class="px-5 py-3">Creado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr *ngFor="let t of misTickets().slice(0, 8)"
            class="hover:bg-blue-50/20 transition-colors group">
            <td class="px-5 py-3.5"><span class="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{{ t.id }}</span></td>
            <td class="px-5 py-3.5 max-w-xs">
              <p class="font-medium text-slate-800 truncate">{{ t.descripcion }}</p>
            </td>
            <td class="px-5 py-3.5 text-slate-600 text-xs">{{ t.nombre_area }}</td>
            <td class="px-5 py-3.5"><span class="px-2 py-0.5 rounded-md text-xs font-semibold" [ngClass]="getPrioridadClass(t.criticidad)">{{ t.criticidad }}</span></td>
            <td class="px-5 py-3.5">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="getEstadoClass(t.estado)">
                <span class="w-1.5 h-1.5 rounded-full bg-current" [class.animate-pulse]="t.estado === 'En Proceso'"></span>
                {{ t.estado }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-xs text-slate-500">{{ t.nombre_especialista || 'Sin asignar' }}</td>
            <td class="px-5 py-3.5 text-xs text-slate-400">{{ t.fecha_creacion | tiempoRelativo }}</td>
          </tr>
          <tr *ngIf="misTickets().length === 0">
            <td colspan="7" class="px-5 py-8 text-center text-sm text-slate-400">No tienes tickets todavía. ¡Crea tu primer ticket!</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
})
export class OperadorDashboardComponent implements OnInit {
  auth    = inject(AuthService);
  tickets = inject(TicketsService);
  toast   = inject(ToastService);
  user    = this.auth.currentUser;

  misTickets = signal<Ticket[]>([]);

  get ticketsResueltos() { return this.misTickets().filter(t => t.estado === EstadoTicket.RESUELTO).length; }
  get ticketMasAntiguo() {
    const abiertos = this.misTickets().filter(t => t.estado !== EstadoTicket.RESUELTO && t.estado !== EstadoTicket.CANCELADO);
    return abiertos.sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime())[0] ?? null;
  }

  ngOnInit() {
    const uid = this.user()?.id ?? 0;
    this.tickets.getTodos().subscribe((ts: Ticket[]) => {
      const myTickets = ts.filter(t => t.id_operador_creador === uid);
      this.misTickets.set(myTickets);
    });
  }

  getPrioridadClass = getPrioridadClass;
  getEstadoClass = getEstadoClass;

  getFirstName(): string {
    const name = this.user()?.nombre;
    return name ? name.split(' ')[0] : '';
  }
}
