import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { KbService } from '../../../services/kb.service';
import { ArticuloKB } from '../../../models/helpdesk.models';

@Component({
  selector: 'app-kb-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
<div class="space-y-6 max-w-5xl mx-auto">
  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Base de Conocimientos</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Base de Conocimientos</h2>
      <p class="text-sm text-slate-400">Gestiona los artículos de ayuda y tutoriales</p>
    </div>
    <button (click)="abrirModal()"
      class="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Nuevo Artículo
    </button>
  </div>

  <!-- Buscador -->
  <div class="relative">
    <input type="text" [formControl]="searchControl" placeholder="Buscar artículo..."
      class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all shadow-sm">
    <svg class="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
  </div>

  <!-- Grid de artículos -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div *ngFor="let articulo of articulos()" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <h3 class="font-bold text-slate-900 text-base mb-2">{{ articulo.titulo }}</h3>
      <p class="text-sm text-slate-500 line-clamp-3 mb-4">{{ articulo.contenido }}</p>
      <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
        <div class="flex items-center gap-3 text-xs text-slate-400 font-medium">
          <span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> {{ articulo.vistas }}</span>
          <span class="flex items-center gap-1 text-emerald-500"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514C5.417 10 5 10.417 5 11v9z"/></svg> {{ articulo.util }}</span>
        </div>
        <span class="text-[10px] text-slate-400 font-medium">{{ articulo.fecha_creacion | date:'dd MMM yyyy' }}</span>
      </div>
    </div>
  </div>
</div>

<!-- Modal Nuevo Articulo -->
<div *ngIf="showModal()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showModal.set(false)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6" (click)="$event.stopPropagation()">
    <div class="flex items-center justify-between mb-5">
      <h3 class="text-base font-bold text-slate-900">Redactar Artículo</h3>
      <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Título del Artículo</label>
        <input formControlName="titulo" type="text" placeholder="ej: Cómo restablecer tu contraseña"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Contenido (Paso a paso)</label>
        <textarea formControlName="contenido" rows="6" placeholder="Describe la solución paso a paso..."
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" [disabled]="form.invalid || guardando()"
          class="flex-1 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
          {{ guardando() ? 'Publicando...' : 'Publicar Artículo' }}
        </button>
        <button type="button" (click)="showModal.set(false)"
          class="px-5 py-2.5 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  </div>
</div>
  `
})
export class KbAdminComponent implements OnInit {
  private svc = inject(KbService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  articulos = signal<ArticuloKB[]>([]);
  showModal = signal(false);
  guardando = signal(false);

  form = this.fb.group({
    titulo: ['', Validators.required],
    contenido: ['', Validators.required],
  });

  searchControl = this.fb.control('');

  ngOnInit() {
    this.cargar();
    this.searchControl.valueChanges.subscribe(q => {
      this.svc.listar(q || '').subscribe(res => this.articulos.set(res));
    });
  }

  cargar() {
    this.svc.listar().subscribe(res => this.articulos.set(res));
  }

  abrirModal() {
    this.form.reset();
    this.showModal.set(true);
  }

  guardar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.svc.crear(this.form.value as any).subscribe({
      next: (art) => {
        this.articulos.update(a => [art, ...a]);
        this.showModal.set(false);
        this.toast.success('Publicado', 'El artículo está disponible en la base de conocimientos');
        this.guardando.set(false);
      },
      error: () => {
        this.toast.error('Error', 'No se pudo publicar');
        this.guardando.set(false);
      }
    });
  }
}
