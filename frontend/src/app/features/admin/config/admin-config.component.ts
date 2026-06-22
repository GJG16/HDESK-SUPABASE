import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { MacrosService } from '../../../services/macros.service';
import { PrioridadTicket, Macro } from '../../../models/helpdesk.models';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
<div class="space-y-6 max-w-3xl">
  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Configuración</span>
  </div>

  <div>
    <h2 class="text-xl font-extrabold text-slate-900">Configuración del Sistema</h2>
    <p class="text-sm text-slate-400">Ajusta los parámetros del Helpdesk</p>
  </div>

  <!-- Macros / Respuestas Predefinidas -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-slate-900">⚡ Macros / Respuestas Predefinidas</h3>
        <p class="text-xs text-slate-400 mt-0.5">Respuestas rápidas que se pueden insertar en comentarios de tickets</p>
      </div>
      <button (click)="showMacroForm.set(!showMacroForm())" class="text-xs text-[#2563EB] font-semibold hover:underline">+ Nueva Macro</button>
    </div>
    <div class="p-6 space-y-3">
      <!-- Form -->
      <div *ngIf="showMacroForm()" class="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 mb-4">
        <input [(ngModel)]="macroTitulo" placeholder="Título de la macro (ej: Saludo inicial)"
          class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-blue-200"/>
        <textarea [(ngModel)]="macroContenido" rows="3" placeholder="Contenido de la respuesta predefinida..."
          class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-blue-200 resize-none"></textarea>
        <div class="flex gap-2">
          <button (click)="crearMacro()" [disabled]="!macroTitulo.trim() || !macroContenido.trim()"
            class="px-4 py-2 bg-[#2563EB] text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar Macro</button>
          <button (click)="showMacroForm.set(false)" class="px-3 py-2 text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm">Cancelar</button>
        </div>
      </div>

      <!-- Lista -->
      <div *ngFor="let m of macrosList()" class="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
        <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold">⚡</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-800">{{ m.titulo }}</p>
          <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ m.contenido }}</p>
        </div>
        <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          [ngClass]="m.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'">
          {{ m.activo ? 'Activa' : 'Inactiva' }}
        </span>
      </div>
      <div *ngIf="macrosList().length === 0" class="text-center py-6 text-sm text-slate-400">
        No hay macros creadas aún. Crea tu primera respuesta predefinida.
      </div>
    </div>
  </div>

  <!-- SLA Config -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
      <h3 class="text-sm font-bold text-slate-900">⏱️ Configuración de SLA</h3>
      <p class="text-xs text-slate-400 mt-0.5">Umbrales de tiempo de respuesta por prioridad</p>
    </div>
    <div class="p-6 space-y-4">
      <div *ngFor="let sla of slas; let i = index" class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="sla.bg">
          <span class="text-lg">{{ sla.emoji }}</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-800">{{ sla.prioridad }}</p>
          <p class="text-xs text-slate-400">Advertencia al {{ sla.advertencia_en }}% del tiempo</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="number" [(ngModel)]="sla.horas_limite" min="1" max="72"
            class="w-16 text-center px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-blue-200 transition-all"/>
          <span class="text-xs text-slate-500 w-8">horas</span>
        </div>
      </div>
      <button (click)="guardarSLA()"
        class="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
        Guardar Configuración SLA
      </button>
    </div>
  </div>

  <!-- Áreas -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-slate-900">🏢 Áreas Técnicas</h3>
        <p class="text-xs text-slate-400 mt-0.5">Departamentos de soporte</p>
      </div>
      <button (click)="nuevaArea = !nuevaArea" class="text-xs text-[#2563EB] font-semibold hover:underline">+ Agregar área</button>
    </div>
    <div class="p-6 space-y-2">
      <div *ngIf="nuevaArea" class="flex items-center gap-2 mb-3">
        <input [(ngModel)]="nombreArea" placeholder="Nombre del área..." class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-blue-200"/>
        <button (click)="agregarArea()" class="px-4 py-2 bg-[#2563EB] text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">Agregar</button>
        <button (click)="nuevaArea = false" class="px-3 py-2 text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">✕</button>
      </div>
      <div *ngFor="let area of areas" class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
        <div class="w-2 h-2 rounded-full shrink-0" [ngClass]="area.activa ? 'bg-emerald-500' : 'bg-slate-300'"></div>
        <p class="flex-1 text-sm font-medium text-slate-800">{{ area.nombre }}</p>
        <button (click)="toggleArea(area)" class="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg"
          [ngClass]="area.activa ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'">
          {{ area.activa ? 'Desactivar' : 'Activar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Configuración General -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
      <h3 class="text-sm font-bold text-slate-900">⚙️ Configuración General</h3>
    </div>
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100">
        <div>
          <p class="text-sm font-semibold text-slate-800">Notificaciones por email</p>
          <p class="text-xs text-slate-400">Enviar alertas cuando el SLA esté en riesgo</p>
        </div>
        <button (click)="emailNotif = !emailNotif"
          class="w-11 h-6 rounded-full transition-colors relative"
          [ngClass]="emailNotif ? 'bg-[#2563EB]' : 'bg-slate-200'">
          <span class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" [ngClass]="emailNotif ? 'left-6' : 'left-1'"></span>
        </button>
      </div>
      <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100">
        <div>
          <p class="text-sm font-semibold text-slate-800">Auto-asignación de técnicos</p>
          <p class="text-xs text-slate-400">Asignar al técnico con menor carga de trabajo</p>
        </div>
        <button (click)="autoAsign = !autoAsign"
          class="w-11 h-6 rounded-full transition-colors relative"
          [ngClass]="autoAsign ? 'bg-[#2563EB]' : 'bg-slate-200'">
          <span class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" [ngClass]="autoAsign ? 'left-6' : 'left-1'"></span>
        </button>
      </div>
    </div>
  </div>
</div>`,
})
export class AdminConfigComponent implements OnInit {
  toast     = inject(ToastService);
  fb        = inject(FormBuilder);
  macrosSvc = inject(MacrosService);

  nuevaArea  = false;
  nombreArea = '';
  emailNotif = true;
  autoAsign  = false;

  // Macros
  showMacroForm = signal(false);
  macroTitulo   = '';
  macroContenido = '';
  macrosList    = signal<Macro[]>([]);

  slas: { prioridad: string; horas_limite: number; advertencia_en: number; emoji: string; bg: string }[] = [
    { prioridad: PrioridadTicket.ALTA,  horas_limite: 4,  advertencia_en: 75, emoji: '🔴', bg: 'bg-red-100' },
    { prioridad: PrioridadTicket.MEDIA, horas_limite: 8,  advertencia_en: 70, emoji: '🟡', bg: 'bg-amber-100' },
    { prioridad: PrioridadTicket.BAJA,  horas_limite: 24, advertencia_en: 60, emoji: '🟢', bg: 'bg-emerald-100' },
  ];

  areas = [
    { id: 1, nombre: 'Redes',           activa: true },
    { id: 2, nombre: 'Hardware',        activa: true },
    { id: 3, nombre: 'Software',        activa: true },
    { id: 4, nombre: 'Soporte General', activa: true },
    { id: 5, nombre: 'Seguridad',       activa: true },
  ];

  ngOnInit() {
    this.macrosSvc.listar().subscribe(m => this.macrosList.set(m));
  }

  crearMacro() {
    if (!this.macroTitulo.trim() || !this.macroContenido.trim()) return;
    this.macrosSvc.crear({ titulo: this.macroTitulo.trim(), contenido: this.macroContenido.trim() }).subscribe({
      next: (m) => {
        this.macrosList.update(list => [m, ...list]);
        this.macroTitulo = '';
        this.macroContenido = '';
        this.showMacroForm.set(false);
        this.toast.success('Macro creada', m.titulo);
      },
      error: () => this.toast.error('Error', 'No se pudo crear la macro')
    });
  }

  guardarSLA() { this.toast.success('SLA guardado', 'Configuración aplicada correctamente'); }
  toggleArea(a: { activa: boolean; nombre: string }) {
    a.activa = !a.activa;
    this.toast.info(a.activa ? 'Área activada' : 'Área desactivada', a.nombre);
  }
  agregarArea() {
    if (!this.nombreArea.trim()) return;
    this.areas.push({ id: this.areas.length + 1, nombre: this.nombreArea.trim(), activa: true });
    this.toast.success('Área creada', this.nombreArea);
    this.nombreArea = ''; this.nuevaArea = false;
  }
}
