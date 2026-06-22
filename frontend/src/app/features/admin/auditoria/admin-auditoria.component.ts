import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService } from '../../../services/dashboard.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { AuditoriaItem } from '../../../models/helpdesk.models';
import { getAvatarInitials } from '../../../shared/utils/badge-helpers';

function getAccionTipo(accion: string): string {
  if (accion.includes('RESUELTO') || accion.includes('ACTIVADO')) return 'success';
  if (accion.includes('ELIMINADO') || accion.includes('DESACTIVADO') || accion.includes('CANCELADO')) return 'warning';
  return 'info';
}

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, RouterModule, TiempoRelativoPipe],
  template: `
<div class="space-y-5">

  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Auditoría</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Auditoría del Sistema</h2>
      <p class="text-sm text-slate-400">Registro cronológico de todas las acciones críticas</p>
    </div>
    <button (click)="reload()" class="flex items-center gap-1.5 px-4 py-2 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      Actualizar
    </button>
  </div>

  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <p class="text-sm font-bold text-slate-900">{{ logs().length }} eventos registrados</p>
      <button (click)="exportarLog()" class="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Exportar log
      </button>
    </div>

    <!-- Loading -->
    <div *ngIf="isLoading()" class="p-6 space-y-4">
      <div *ngFor="let i of [1,2,3,4,5]" class="flex items-start gap-4">
        <div class="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
        <div class="flex-1 bg-slate-100 rounded-xl h-16 animate-pulse"></div>
      </div>
    </div>

    <!-- Timeline -->
    <div *ngIf="!isLoading()" class="relative px-6 py-4">
      <div class="absolute left-[52px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
      <div class="space-y-4">
        <div *ngFor="let log of logs()" class="flex items-start gap-4 relative animate-fade-in">
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-full font-bold text-xs text-white flex items-center justify-center shrink-0 z-10 shadow-sm"
            [ngClass]="getTipo(log.accion) === 'success' ? 'bg-emerald-500' : getTipo(log.accion) === 'warning' ? 'bg-amber-500' : 'bg-[#2563EB]'">
            {{ getAvatar(log.nombre_usuario || 'SI') }}
          </div>

          <!-- Contenido -->
          <div class="flex-1 bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-100 ml-4">
            <div class="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-2"
                  [ngClass]="getTipo(log.accion) === 'success' ? 'bg-emerald-100 text-emerald-700' : getTipo(log.accion) === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
                  {{ log.accion.replace('_', ' ') }}
                </span>
                <span class="text-sm font-semibold text-slate-800">{{ log.entidad }}</span>
              </div>
              <span class="text-[10px] text-slate-400 shrink-0">{{ log.fecha | tiempoRelativo }}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ log.detalle || 'Sin detalles' }} · por <strong class="text-slate-700">{{ log.nombre_usuario || 'Sistema' }}</strong></p>
          </div>
        </div>
        <div *ngIf="logs().length === 0" class="text-center py-8 text-sm text-slate-400">
          No hay registros de auditoría
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class AdminAuditoriaComponent implements OnInit {
  private svc = inject(DashboardService);

  logs      = signal<AuditoriaItem[]>([]);
  isLoading = signal(true);

  ngOnInit() { this.reload(); }

  reload() {
    this.isLoading.set(true);
    this.svc.getAuditoria(100).subscribe({
      next: (data) => { this.logs.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  getTipo = getAccionTipo;
  getAvatar = getAvatarInitials;

  exportarLog() {
    const rows = [
      ['ID', 'Acción', 'Entidad', 'Detalle', 'Usuario', 'Fecha'],
      ...this.logs().map(l => [l.id.toString(), l.accion, l.entidad, l.detalle || '', l.nombre_usuario || '', l.fecha]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'auditoria-helpdesk.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
