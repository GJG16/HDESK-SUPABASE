import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketsService } from '../../../services/tickets.service';
import { KbService } from '../../../services/kb.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrioridadTicket, ArticuloKB } from '../../../models/helpdesk.models';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-nuevo-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
  <!-- Formulario -->
  <div class="flex-1">
    <div class="mb-6">
      <h2 class="text-xl font-extrabold text-slate-900">Crear Nuevo Ticket</h2>
      <p class="text-sm text-slate-500 mt-0.5">Completa todos los campos para registrar el problema</p>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">

        <!-- Título -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Título corto <span class="text-red-500">*</span></label>
          <input formControlName="titulo" type="text" placeholder="ej: No puedo acceder a mi correo"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
        </div>

        <!-- Descripción -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">
            Descripción del problema <span class="text-red-500">*</span>
          </label>
          <textarea formControlName="descripcion" rows="4"
            placeholder="Describe el problema con el mayor detalle posible: síntomas, mensajes de error..."
            class="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none resize-none transition-all"
            [ngClass]="descCtrl.invalid && descCtrl.touched ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 focus:bg-white'">
          </textarea>
          <div class="flex justify-between mt-1">
            <p *ngIf="descCtrl.invalid && descCtrl.touched" class="text-red-500 text-xs">Mínimo 20 caracteres requeridos</p>
            <p class="text-xs text-slate-400 ml-auto">{{ descCtrl.value?.length || 0 }} / 500</p>
          </div>
        </div>

        <!-- Fila: Prioridad -->
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Prioridad sugerida <span class="text-red-500">*</span>
            </label>
            <div class="space-y-2">
              <label *ngFor="let p of prioridades" class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-slate-50"
                [ngClass]="form.value.prioridad === p.value ? p.activeClass : 'border-slate-200'">
                <input type="radio" formControlName="prioridad" [value]="p.value" class="sr-only">
                <span class="w-3 h-3 rounded-full shrink-0" [ngClass]="p.dotClass"></span>
                <span class="text-sm font-medium text-slate-700">{{ p.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Info adicional -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex gap-3">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p>El ticket será evaluado y asignado automáticamente a un técnico disponible a través del sistema de triaje inteligente. Recibirás una notificación cuando cambie de estado.</p>
        </div>

        <!-- Archivos (Solo UI visual por ahora hasta conectar) -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Adjuntar Archivos (Opcional)</label>
          <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer group"
            (click)="fileInput.click()"
            (dragover)="$event.preventDefault(); $event.stopPropagation()"
            (drop)="$event.preventDefault(); onDrop($event)">
            <svg class="w-8 h-8 mb-2 text-slate-400 group-hover:text-[#2563EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            <span class="text-sm font-medium">Haz clic o arrastra archivos aquí</span>
            <span class="text-xs mt-1 opacity-70">PNG, JPG, PDF hasta 10MB</span>
            <input type="file" multiple class="hidden" (change)="onFileSelected($event)" #fileInput>
          </div>
          <div *ngIf="archivos.length > 0" class="mt-3 space-y-2">
            <div *ngFor="let file of archivos; let i = index" class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <span class="truncate max-w-[200px]">{{ file.name }}</span>
              <button type="button" (click)="archivos.splice(i, 1)" class="text-red-500 hover:text-red-700">✕</button>
            </div>
          </div>
        </div>

        <!-- Botones -->
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="isLoading() || form.invalid"
            class="flex-1 py-3 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm">
            <span *ngIf="!isLoading()">✓ Crear Ticket</span>
            <span *ngIf="isLoading()" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Creando...
            </span>
          </button>
          <button type="button" (click)="router.navigate(['/operador/dashboard'])"
            class="px-6 py-3 text-slate-600 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Panel Lateral KB (Deflection) -->
  <div class="w-full md:w-80 shrink-0 space-y-4">
    <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
      <h3 class="text-emerald-800 font-bold flex items-center gap-2 mb-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        ¿Te puede ayudar esto?
      </h3>
      <p class="text-emerald-600 text-xs mb-4">Revisamos tu consulta y encontramos estos artículos en nuestra base de conocimientos que podrían resolver tu problema inmediatamente.</p>

      <div *ngIf="sugerenciasKB().length === 0" class="text-sm text-emerald-600/70 italic text-center py-4">
        Escribe en el título o descripción para ver sugerencias...
      </div>

      <div class="space-y-3">
        <div *ngFor="let s of sugerenciasKB()" class="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer group" (click)="abrirArticulo(s)">
          <h4 class="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{{ s.titulo }}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mt-1">{{ s.contenido }}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal Artículo KB -->
<div *ngIf="articuloSeleccionado()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="articuloSeleccionado.set(null)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8" (click)="$event.stopPropagation()">
    <h2 class="text-xl font-bold text-slate-900 mb-4">{{ articuloSeleccionado()?.titulo }}</h2>
    <div class="prose prose-sm text-slate-700 mb-6 whitespace-pre-wrap">{{ articuloSeleccionado()?.contenido }}</div>
    
    <div class="bg-slate-50 rounded-xl p-4 flex items-center justify-between mt-8 border border-slate-100">
      <span class="text-sm font-semibold text-slate-700">¿Resolvió esto tu problema?</span>
      <div class="flex gap-2">
        <button (click)="router.navigate(['/operador/dashboard'])" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors">Sí, cerrar ticket</button>
        <button (click)="articuloSeleccionado.set(null)" class="px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold rounded-lg transition-colors">No, continuar creando</button>
      </div>
    </div>
  </div>
</div>
`
})
export class NuevoTicketComponent implements OnInit {
  fb      = inject(FormBuilder);
  auth    = inject(AuthService);
  tickets = inject(TicketsService);
  kb      = inject(KbService);
  toast   = inject(ToastService);
  router  = inject(Router);

  isLoading = signal(false);
  archivos: File[] = [];

  sugerenciasKB = signal<ArticuloKB[]>([]);
  articuloSeleccionado = signal<ArticuloKB | null>(null);

  prioridades = [
    { value: PrioridadTicket.ALTA,  label: 'Alta Prioridad',  dotClass: 'bg-red-500',   activeClass: 'border-red-300 bg-red-50' },
    { value: PrioridadTicket.MEDIA, label: 'Media Prioridad', dotClass: 'bg-amber-400', activeClass: 'border-amber-300 bg-amber-50' },
    { value: PrioridadTicket.BAJA,  label: 'Baja Prioridad',  dotClass: 'bg-slate-400', activeClass: 'border-slate-300 bg-slate-50' },
  ];

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    prioridad:   [PrioridadTicket.MEDIA, Validators.required],
  });

  get descCtrl() { return this.form.get('descripcion')!; }

  ngOnInit() {
    // Deflection logic: search KB when typing title or desc
    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => prev.titulo === curr.titulo && prev.descripcion === curr.descripcion)
    ).subscribe(val => {
      const q = `${val.titulo || ''} ${val.descripcion || ''}`.trim();
      if (q.length > 5) {
        this.kb.listar(q).subscribe(res => this.sugerenciasKB.set(res.slice(0, 3))); // Top 3
      } else {
        this.sugerenciasKB.set([]);
      }
    });
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for(let f of files) this.archivos.push(f);
    }
  }

  onDrop(event: DragEvent) {
    const files = event.dataTransfer?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) this.archivos.push(files[i]);
    }
  }

  abrirArticulo(art: ArticuloKB) {
    this.articuloSeleccionado.set(art);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    const uid = this.auth.currentUser()?.id ?? 0;
    
    this.tickets.crearTicket({
      titulo: this.form.value.titulo!,
      descripcion:  this.form.value.descripcion!,
      criticidad:   this.form.value.prioridad as string,
      id_operador_creador:  uid,
    }).subscribe({
      next: (t) => {
        // Upload attachments if any
        if (this.archivos.length > 0) {
          const uploads = this.archivos.map(f => this.tickets.subirAdjunto(t.id, f, undefined, uid).toPromise());
          Promise.allSettled(uploads).then(() => {
            this.finalizarCreacion(t);
          });
        } else {
          this.finalizarCreacion(t);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error', 'No se pudo crear el ticket');
      },
    });
  }

  private finalizarCreacion(t: any) {
    this.isLoading.set(false);
    this.toast.success('Ticket creado', `#${t.id} registrado correctamente`);
    this.router.navigate(['/operador/mis-tickets']);
  }
}
