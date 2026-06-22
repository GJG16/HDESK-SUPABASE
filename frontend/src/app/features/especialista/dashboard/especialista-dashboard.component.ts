import { Component, OnInit, AfterViewInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketsService } from '../../../services/tickets.service';
import { DashboardService } from '../../../services/dashboard.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { Ticket, MapaCalorItem } from '../../../models/helpdesk.models';
import {
  getPrioridadClass, getEstadoClass,
  getSemaforoSla, getSlaIconClass, getSlaTextoSemaforo,
} from '../../../shared/utils/badge-helpers';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-especialista-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TiempoRelativoPipe],
  template: `
<div class="space-y-6">
  <!-- Header -->
  <div>
    <h2 class="text-xl font-extrabold text-slate-900">Mi Panel — {{ user()?.especialidad || 'Técnico' }}</h2>
    <p class="text-sm text-slate-400 mt-0.5">Resumen de tu actividad del turno</p>
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">En Mi Cola</p>
      <p class="text-3xl font-extrabold text-blue-600">{{ colaActiva.length }}</p>
      <p class="text-xs text-slate-400 mt-1">tickets activos</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resueltos</p>
      <p class="text-3xl font-extrabold text-emerald-600">{{ resueltos }}</p>
      <p class="text-xs text-slate-400 mt-1">en total</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SLA en Riesgo</p>
      <p class="text-3xl font-extrabold" [ngClass]="slaRiesgo > 0 ? 'text-red-500' : 'text-slate-300'">{{ slaRiesgo }}</p>
      <p class="text-xs text-slate-400 mt-1">más de 4h sin atención</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mi Carga</p>
      <p class="text-3xl font-extrabold text-amber-600">{{ colaActiva.length }}<span class="text-lg font-medium text-slate-400">/10</span></p>
      <p class="text-xs text-slate-400 mt-1">capacidad máx.</p>
    </div>
  </div>

  <!-- Mapa de Calor: Departamentos con más fallas (Mejora 3 — Chart.js + Pandas) -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100">
      <h3 class="text-base font-bold text-slate-900">🔥 Mapa de Calor — Departamentos con más fallas hoy</h3>
      <p class="text-xs text-slate-400">Análisis con Pandas groupby() en el backend</p>
    </div>
    <div class="p-6">
      <div *ngIf="mapaCalorData().length > 0" class="h-64">
        <canvas #chartCanvas></canvas>
      </div>
      <div *ngIf="mapaCalorData().length === 0" class="py-8 text-center text-sm text-slate-400">
        No hay datos suficientes para el mapa de calor
      </div>
    </div>
  </div>

  <!-- Ticket activo destacado -->
  <div *ngIf="ticketActivo" class="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <p class="text-xs font-bold uppercase tracking-wide opacity-80">Ticket en Atención Activa</p>
        </div>
        <p class="font-bold text-lg leading-snug truncate">#{{ ticketActivo.id }} — {{ ticketActivo.descripcion }}</p>
        <p class="text-sm opacity-80 mt-1" *ngIf="ticketActivo.nombre_departamento_origen">
          🏢 Origen: {{ ticketActivo.nombre_departamento_origen }}
        </p>
        <p class="text-sm opacity-80 mt-1">Creado: {{ ticketActivo.fecha_creacion | tiempoRelativo }}</p>
      </div>
      <a routerLink="/especialista/cola" class="shrink-0 bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors backdrop-blur">
        Ver Cola →
      </a>
    </div>
  </div>

  <!-- Cola rápida -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-slate-900">Cola de Trabajo — Urgentes</h3>
        <p class="text-xs text-slate-400">Alta prioridad primero · Semáforo SLA activo</p>
      </div>
      <a routerLink="/especialista/cola" class="text-xs text-emerald-600 font-semibold hover:underline">Ver todo →</a>
    </div>
    <div class="divide-y divide-slate-50">
      <div *ngFor="let t of colaActiva.slice(0,5)" class="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
        <!-- Semáforo SLA (Mejora 5) -->
        <span class="w-3 h-3 rounded-full shrink-0"
          [ngClass]="{
            'bg-emerald-500': getSemaforoSla(t) === 'verde',
            'bg-amber-400 animate-pulse': getSemaforoSla(t) === 'amarillo',
            'bg-red-500 animate-pulse': getSemaforoSla(t) === 'rojo'
          }"></span>
        <span class="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{{ t.id }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-800 truncate">{{ t.descripcion }}</p>
          <p class="text-xs text-slate-400" *ngIf="t.nombre_departamento_origen">🏢 Origen: {{ t.nombre_departamento_origen }}</p>
        </div>
        <span class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0" [ngClass]="getPClass(t.criticidad)">{{ t.criticidad }}</span>
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0" [ngClass]="getEClass(t.estado)">
          <span class="w-1.5 h-1.5 rounded-full bg-current" [class.animate-pulse]="t.estado === 'En Proceso'"></span>
          {{ t.estado }}
        </span>
        <span class="text-xs font-mono shrink-0" [ngClass]="getSlaIcon(t)">{{ getSlaTexto(t) }}</span>
      </div>
      <div *ngIf="colaActiva.length === 0" class="px-6 py-8 text-center text-sm text-slate-400">
        🎉 No tienes tickets pendientes en este momento
      </div>
    </div>
  </div>
</div>`,
})
export class EspecialistaDashboardComponent implements OnInit, AfterViewInit {
  auth      = inject(AuthService);
  tickets   = inject(TicketsService);
  dashboard = inject(DashboardService);
  user      = this.auth.currentUser;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  cola            = signal<Ticket[]>([]);
  mapaCalorData   = signal<MapaCalorItem[]>([]);
  private chart?: Chart;

  get colaActiva()   { return this.cola().filter(t => t.estado !== 'Resuelto' && t.estado !== 'Cancelado'); }
  get resueltos()    { return this.cola().filter(t => t.estado === 'Resuelto').length; }
  get slaRiesgo()    { return this.colaActiva.filter(t => getSemaforoSla(t) === 'rojo').length; }
  get ticketActivo() { return this.colaActiva.find(t => t.estado === 'En Proceso' && t.id_especialista === this.user()?.id) ?? null; }

  ngOnInit() {
    // Cargar todos los tickets
    this.tickets.getTodos().subscribe(ts => this.cola.set(ts));

    // Cargar mapa de calor desde Pandas (Mejora 3)
    this.dashboard.getMapaCalorDepartamentos().subscribe({
      next: (resp) => {
        this.mapaCalorData.set(resp.datos || []);
        setTimeout(() => this.renderChart(), 100);
      },
      error: () => this.mapaCalorData.set([]),
    });
  }

  ngAfterViewInit() {
    if (this.mapaCalorData().length > 0) {
      this.renderChart();
    }
  }

  private renderChart() {
    if (!this.chartCanvas?.nativeElement || this.mapaCalorData().length === 0) return;
    if (this.chart) this.chart.destroy();

    const data = this.mapaCalorData();
    const colores = [
      'rgba(239, 68, 68, 0.85)',   // rojo
      'rgba(245, 158, 11, 0.85)',  // amber
      'rgba(59, 130, 246, 0.85)',  // blue
      'rgba(16, 185, 129, 0.85)',  // emerald
      'rgba(139, 92, 246, 0.85)',  // purple
      'rgba(236, 72, 153, 0.85)',  // pink
    ];

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.departamento),
        datasets: [{
          label: 'Tickets Activos',
          data: data.map(d => d.cantidad),
          backgroundColor: data.map((_, i) => colores[i % colores.length]),
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: 'Críticos',
          data: data.map(d => d.criticos),
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const item = data[ctx.dataIndex];
                return `${item.porcentaje}% del total`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          }
        }
      }
    });
  }

  // Helpers
  getSemaforoSla = getSemaforoSla;
  getSlaIcon     = getSlaIconClass;
  getSlaTexto    = getSlaTextoSemaforo;
  getPClass      = getPrioridadClass;
  getEClass      = getEstadoClass;
}
