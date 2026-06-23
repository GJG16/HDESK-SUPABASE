import { Component, AfterViewInit, ElementRef, ViewChild, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardMetrics, RendimientoResponse, ForecastingPicosItem } from '../../../models/helpdesk.models';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="space-y-6">

  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Reportes y Métricas</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Reportes y Métricas</h2>
      <p class="text-sm text-slate-400">Análisis de rendimiento del equipo de soporte</p>
    </div>
    <div class="flex items-center gap-2">
      <button (click)="exportarCSV()"
        class="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-500/20">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Exportar CSV
      </button>
    </div>
  </div>

  <!-- KPIs resumen -->
  <div *ngIf="isLoading()" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
      <div class="h-3 w-24 bg-slate-200 rounded mb-2"></div>
      <div class="h-7 w-16 bg-slate-200 rounded mb-1"></div>
      <div class="h-2 w-20 bg-slate-100 rounded"></div>
    </div>
  </div>

  <div *ngIf="!isLoading()" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div *ngFor="let kpi of kpis()" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{{ kpi.label }}</p>
      <p class="text-2xl font-extrabold" [ngClass]="kpi.color">{{ kpi.valor }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ kpi.sub }}</p>
    </div>
  </div>

  <!-- Gráficos -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
    <!-- Dona: Por estado -->
    <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
      <h3 class="text-sm font-bold text-slate-800 mb-4">Distribución por Estado</h3>
      <div class="flex-1 flex items-center justify-center">
        <canvas #donutChart class="max-h-48"></canvas>
      </div>
    </div>
    <!-- Barras: Por área -->
    <div class="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 class="text-sm font-bold text-slate-800 mb-4">Tickets por Área Técnica</h3>
      <canvas #barChart class="max-h-52"></canvas>
    </div>
  </div>

  <!-- Tabla TTR por técnico -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
    <div class="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-bold text-slate-800">Ranking TTR por Técnico</h3>
        <p class="text-xs text-slate-400">Tiempo promedio de resolución</p>
      </div>
      <div class="divide-y divide-slate-50">
        <div *ngFor="let tec of tecnicosRanking(); let i = index" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
          <span class="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center"
            [ngClass]="i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 text-slate-500'">{{ i + 1 }}</span>
          <div class="w-7 h-7 rounded-full bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center">{{ tec.avatar }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-800 truncate">{{ tec.nombre }}</p>
            <p class="text-[10px] text-slate-400">{{ tec.area }}</p>
          </div>
          <span class="text-xs font-bold" [ngClass]="tec.ttr < 2 ? 'text-emerald-600' : tec.ttr < 4 ? 'text-amber-600' : 'text-red-500'">{{ tec.ttr }}h</span>
        </div>
        <div *ngIf="tecnicosRanking().length === 0" class="px-5 py-6 text-center text-sm text-slate-400">
          No hay datos de rendimiento disponibles
        </div>
      </div>
    </div>

    <!-- Top tickets antiguos sin resolver -->
    <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-bold text-slate-800">Distribución por Criticidad</h3>
        <p class="text-xs text-slate-400">Tickets por nivel de prioridad</p>
      </div>
      <div class="p-5 flex-1 flex items-center justify-center">
        <canvas #criticidadChart class="max-h-40"></canvas>
      </div>
    </div>
  </div>

  <!-- Fase 3: Forecasting de Picos (Pandas) -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
    <div class="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <h3 class="text-sm font-bold text-slate-800">Predicción de Saturación (Forecasting)</h3>
      </div>
      <p class="text-xs text-slate-500 mt-1">Análisis histórico de horas pico de creación de tickets generado con Pandas.</p>
    </div>
    
    <div class="p-5">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div *ngFor="let pico of forecastingPicos(); let i = index" class="relative bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
          <div class="absolute top-0 right-0 w-16 h-16 bg-indigo-500 rounded-bl-full opacity-10 group-hover:scale-110 transition-transform"></div>
          <span class="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded mb-2">Top {{i + 1}}</span>
          <p class="text-lg font-black text-slate-800">{{ pico.dia_semana }}</p>
          <p class="text-sm font-bold text-slate-500 mb-1">{{ pico.hora }}:00 hs</p>
          <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/60">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
            <span class="text-xs font-semibold text-slate-600">{{ pico.volumen_tickets }} tickets prom.</span>
          </div>
        </div>
        
        <div *ngIf="forecastingPicos().length === 0 && !isLoading()" class="col-span-full py-8 text-center text-sm text-slate-400 italic">
          Aún no hay suficientes datos históricos para el modelo predictivo.
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class AdminReportesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart')   barRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('criticidadChart') criticidadRef!: ElementRef<HTMLCanvasElement>;

  private svc   = inject(DashboardService);
  toast = inject(ToastService);
  charts: any[] = [];
  isLoading = signal(true);

  dashData  = signal<DashboardMetrics | null>(null);
  rendData  = signal<RendimientoResponse | null>(null);

  kpis = signal<{ label: string; valor: string; color: string; sub: string }[]>([]);

  tecnicosRanking = signal<{ nombre: string; avatar: string; area: string; ttr: number }[]>([]);
  forecastingPicos = signal<ForecastingPicosItem[]>([]);

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.isLoading.set(true);
    this.svc.getDashboard().subscribe({
      next: (data) => {
        this.dashData.set(data);
        this.buildKpis(data);
        this.isLoading.set(false);
        // Rebuild charts once view is ready
        setTimeout(() => this.buildChartsFromData(data), 100);
      },
      error: () => {
        this.isLoading.set(false);
        // If API fails, show placeholder data
        this.kpis.set([
          { label: 'Tickets Totales', valor: '--', color: 'text-slate-900', sub: 'Sin datos' },
          { label: 'Resueltos', valor: '--', color: 'text-emerald-600', sub: 'Sin datos' },
          { label: 'Abiertos', valor: '--', color: 'text-amber-600', sub: 'Sin datos' },
          { label: 'Tasa Resolución', valor: '--', color: 'text-purple-600', sub: 'Sin datos' },
        ]);
      },
    });

    this.svc.getRendimiento().subscribe({
      next: (rend) => {
        this.rendData.set(rend);
        if (rend && Array.isArray(rend as any)) {
          this.tecnicosRanking.set(
            (rend as any).map((r: any) => ({
              nombre: `Área ${r.area_id}`,
              avatar: `A${r.area_id}`,
              area: `Área #${r.area_id}`,
              ttr: Number(r.tiempo_promedio_horas?.toFixed(1) || 0),
            }))
          );
        }
      },
      error: () => {},
    });

    // Cargar forecasting
    this.svc.getForecastingPicos().subscribe({
      next: (res) => {
        if (res.horas_pico_historicas) {
          this.forecastingPicos.set(res.horas_pico_historicas);
        }
      },
      error: () => {}
    });
  }

  private buildKpis(data: DashboardMetrics) {
    const total = data.total_tickets || 0;
    const porEstado = data.por_estado || {};
    const resueltos = porEstado['Resuelto'] || 0;
    const enProceso = porEstado['En Proceso'] || 0;
    const pendientes = porEstado['Pendiente'] || 0;
    const tasa = total > 0 ? ((resueltos / total) * 100).toFixed(1) : '0';

    this.kpis.set([
      { label: 'Tickets Totales', valor: total.toString(), color: 'text-slate-900', sub: 'Total acumulado' },
      { label: 'Resueltos', valor: resueltos.toString(), color: 'text-emerald-600', sub: `${tasa}% de resolución` },
      { label: 'Abiertos', valor: (pendientes + enProceso).toString(), color: 'text-amber-600', sub: `${pendientes} pendientes, ${enProceso} en proceso` },
      { label: 'Tasa Resolución', valor: `${tasa}%`, color: 'text-purple-600', sub: 'De tickets resueltos' },
    ]);
  }

  private buildChartsFromData(data: DashboardMetrics) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const porEstado = data.por_estado || {};
    const porArea = data.por_area || {};
    const porCriticidad = data.por_criticidad || {};

    // Donut chart — por estado
    if (this.donutRef?.nativeElement) {
      const labels = Object.keys(porEstado);
      const values = Object.values(porEstado);
      const colors: Record<string, string> = {
        'Resuelto': '#10B981', 'En Proceso': '#F59E0B', 'Pendiente': '#94A3B8', 'Cancelado': '#EF4444'
      };
      const bgColors = labels.map(l => colors[l] || '#64748B');

      const c = new Chart(this.donutRef.nativeElement, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: bgColors, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } }, cutout: '68%' },
      });
      this.charts.push(c);
    }

    // Bar chart — por área
    if (this.barRef?.nativeElement) {
      const labels = Object.keys(porArea).map(k => `Área ${k}`);
      const values = Object.values(porArea);

      const c = new Chart(this.barRef.nativeElement, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Tickets', data: values, backgroundColor: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#818CF8', '#A78BFA'], borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } },
      });
      this.charts.push(c);
    }

    // Criticidad donut
    if (this.criticidadRef?.nativeElement) {
      const labels = Object.keys(porCriticidad);
      const values = Object.values(porCriticidad);
      const colors: Record<string, string> = {
        'Critica': '#DC2626', 'Alta': '#EF4444', 'Media': '#F59E0B', 'Baja': '#10B981'
      };
      const bgColors = labels.map(l => colors[l] || '#64748B');

      const c = new Chart(this.criticidadRef.nativeElement, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: bgColors, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } }, cutout: '60%' },
      });
      this.charts.push(c);
    }
  }

  ngAfterViewInit() {
    // Charts will be built by loadData -> setTimeout
  }

  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }

  exportarCSV() {
    const data = this.dashData();
    if (!data) return;

    const rows = [
      ['Métrica', 'Valor'],
      ['Total Tickets', data.total_tickets.toString()],
      ...Object.entries(data.por_estado || {}).map(([k, v]) => [`Estado: ${k}`, v.toString()]),
      ...Object.entries(data.por_criticidad || {}).map(([k, v]) => [`Criticidad: ${k}`, v.toString()]),
      ...Object.entries(data.por_area || {}).map(([k, v]) => [`Área ID: ${k}`, v.toString()]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'reporte-helpdesk.csv'; a.click();
    URL.revokeObjectURL(url);
    this.toast.success('CSV exportado', 'El archivo se descargó correctamente');
  }
}
