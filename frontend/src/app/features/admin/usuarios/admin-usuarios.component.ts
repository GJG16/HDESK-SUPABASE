import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardService } from '../../../services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  RolUsuario, Usuario, DepartamentoNegocio, AreaTecnica, UsuarioCreate,
} from '../../../models/helpdesk.models';

const ROL_CONFIG: Record<string, { label: string; class: string; bg: string }> = {
  [RolUsuario.ADMINISTRADOR]: { label: 'Admin',   class: 'bg-purple-100 text-purple-700', bg: 'bg-purple-500' },
  [RolUsuario.ESPECIALISTA]:  { label: 'Técnico', class: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-500' },
  [RolUsuario.OPERADOR]:      { label: 'Operador', class: 'bg-blue-100 text-blue-700', bg: 'bg-blue-500' },
};

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
<div class="space-y-5">
  <!-- Breadcrumbs -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a routerLink="/admin/dashboard" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">Usuarios</span>
  </div>

  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900">Gestión de Usuarios</h2>
      <p class="text-sm text-slate-400">Administra los miembros del equipo Conecta BPO</p>
    </div>
    <button (click)="abrirModal()" id="btn-nuevo-usuario"
      class="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Nuevo Usuario
    </button>
  </div>

  <!-- Filtros por rol -->
  <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
    <button *ngFor="let f of filtros" (click)="filtroActivo.set(f)"
      class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      [ngClass]="filtroActivo() === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
      {{ f }}
    </button>
  </div>

  <!-- Grid de tarjetas de usuario -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div *ngFor="let u of usuariosFiltrados"
      class="bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md"
      [ngClass]="u.activo ? 'border-slate-100' : 'border-slate-100 opacity-60'">

      <!-- Avatar + Rol -->
      <div class="flex items-center justify-between">
        <div class="w-11 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center shadow-sm"
          [ngClass]="getRolCfg(u.rol).bg">
          {{ getInitials(u.nombre) }}
        </div>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide" [ngClass]="getRolCfg(u.rol).class">
          {{ getRolCfg(u.rol).label }}
        </span>
      </div>

      <!-- Info -->
      <div>
        <p class="font-bold text-slate-900 text-sm">{{ u.nombre }}</p>
        <p class="text-xs text-slate-400 truncate">{{ u.email }}</p>
        <p *ngIf="u.especialidad" class="text-xs text-slate-500 mt-0.5">🔧 {{ u.especialidad }}</p>
        <p *ngIf="u.extension" class="text-xs text-slate-500 mt-0.5">📞 Ext. {{ u.extension }}</p>
        <p *ngIf="u.nombre_departamento" class="text-xs text-indigo-600 mt-0.5">🏢 {{ u.nombre_departamento }}</p>
        <p *ngIf="u.nombre_area_tecnica" class="text-xs text-emerald-600 mt-0.5">🛠 {{ u.nombre_area_tecnica }}</p>
      </div>

      <!-- Estado + acciones (Mejora 4: Soft Delete) -->
      <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold"
          [ngClass]="u.activo ? 'text-emerald-600' : 'text-slate-400'">
          <span class="w-2 h-2 rounded-full" [ngClass]="u.activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></span>
          {{ u.activo ? 'Activo' : 'Inactivo' }}
        </span>
        <button (click)="toggleActivo(u)"
          [disabled]="procesandoId() === u.id"
          class="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
          [ngClass]="u.activo ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'">
          {{ u.activo ? 'Desactivar' : 'Activar' }}
        </button>
      </div>
    </div>

    <div *ngIf="usuariosFiltrados.length === 0" class="sm:col-span-2 lg:col-span-3 py-10 text-center text-sm text-slate-400">
      No hay usuarios en esta categoría
    </div>
  </div>
</div>

<!-- Modal de confirmación de desactivación -->
<div *ngIf="confirmarDesactivacion()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="confirmarDesactivacion.set(null)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
    <div class="text-center">
      <div class="w-14 h-14 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
      </div>
      <h3 class="text-base font-bold text-slate-900 mb-1">¿Desactivar usuario?</h3>
      <p class="text-sm text-slate-500 mb-1">{{ confirmarDesactivacion()?.nombre }}</p>
      <p class="text-xs text-slate-400 mb-5">El usuario no podrá acceder al sistema pero su historial de tickets se conservará.</p>
      <div class="flex gap-3">
        <button (click)="ejecutarDesactivacion()"
          class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors">
          Sí, desactivar
        </button>
        <button (click)="confirmarDesactivacion.set(null)"
          class="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal de nuevo usuario (Mejora 1 + 2) -->
<div *ngIf="showModal()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showModal.set(false)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
    <div class="flex items-center justify-between mb-5">
      <h3 class="text-base font-bold text-slate-900">Nuevo Usuario</h3>
      <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <form [formGroup]="form" (ngSubmit)="guardarUsuario()" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre completo</label>
        <input formControlName="nombre" type="text" placeholder="ej: María González"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
        <input formControlName="email" type="email" placeholder="usuario@conectabpo.co"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
        <input formControlName="password" type="password" placeholder="Mínimo 6 caracteres"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Rol</label>
        <select formControlName="rol" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] transition-all">
          <option value="Operador">Operador</option>
          <option value="Tecnico">Técnico</option>
          <option value="Administrador">Administrador</option>
        </select>
      </div>

      <!-- Campo condicional: Departamento (solo Operadores) -->
      <div *ngIf="form.value.rol === 'Operador'">
        <label class="block text-xs font-semibold text-slate-700 mb-1">Departamento <span class="text-red-500">*</span></label>
        <select formControlName="id_departamento" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] transition-all">
          <option [ngValue]="null" disabled>Selecciona departamento</option>
          <option *ngFor="let d of departamentos()" [ngValue]="d.id">{{ d.nombre }}</option>
        </select>
        <p class="text-[10px] text-slate-400 mt-0.5">Departamento de negocio al que pertenece el operador</p>
      </div>

      <!-- Campos condicionales: Área Técnica + Especialidad (solo Técnicos) -->
      <div *ngIf="form.value.rol === 'Tecnico'">
        <label class="block text-xs font-semibold text-slate-700 mb-1">Área Técnica <span class="text-red-500">*</span></label>
        <select formControlName="id_area_tecnica" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] transition-all">
          <option [ngValue]="null" disabled>Selecciona área técnica</option>
          <option *ngFor="let a of areas()" [ngValue]="a.id">{{ a.nombre_area }}</option>
        </select>
        <p class="text-[10px] text-slate-400 mt-0.5">Área de soporte a la que se asigna el técnico</p>
      </div>
      <div *ngIf="form.value.rol === 'Tecnico'">
        <label class="block text-xs font-semibold text-slate-700 mb-1">Especialidad</label>
        <input formControlName="especialidad" type="text" placeholder="ej: Redes, Hardware, Seguridad"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>

      <!-- Campo condicional: Extensión (solo Operadores) -->
      <div *ngIf="form.value.rol === 'Operador'">
        <label class="block text-xs font-semibold text-slate-700 mb-1">Extensión telefónica</label>
        <input formControlName="extension" type="text" placeholder="ej: 1042"
          class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"/>
      </div>

      <!-- Error del backend -->
      <p *ngIf="errorMsg()" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ errorMsg() }}</p>

      <div class="flex gap-3 pt-2">
        <button type="submit" [disabled]="form.invalid || guardando()"
          class="flex-1 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
          {{ guardando() ? 'Creando...' : 'Crear Usuario' }}
        </button>
        <button type="button" (click)="showModal.set(false)"
          class="px-5 py-2.5 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  </div>
</div>`,
})
export class AdminUsuariosComponent implements OnInit {
  private svc   = inject(DashboardService);
  private toast = inject(ToastService);
  private fb    = inject(FormBuilder);

  usuarios              = signal<Usuario[]>([]);
  departamentos         = signal<DepartamentoNegocio[]>([]);
  areas                 = signal<AreaTecnica[]>([]);
  filtroActivo          = signal('Todos');
  showModal             = signal(false);
  guardando             = signal(false);
  errorMsg              = signal('');
  procesandoId          = signal<number | null>(null);
  confirmarDesactivacion = signal<Usuario | null>(null);

  filtros = ['Todos', 'Operador', 'Tecnico', 'Administrador'];

  form = this.fb.group({
    nombre:          ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    rol:             ['Operador', Validators.required],
    id_departamento: [null as number | null],
    id_area_tecnica: [null as number | null],
    especialidad:    [''],
    extension:       [''],
  });

  get usuariosFiltrados() {
    const f = this.filtroActivo();
    return f === 'Todos' ? this.usuarios() : this.usuarios().filter(u => u.rol === f);
  }

  ngOnInit() {
    this.cargarDatos();
  }

  private cargarDatos() {
    this.svc.getUsuarios().subscribe(us => this.usuarios.set(us));
    this.svc.getDepartamentos().subscribe(ds => this.departamentos.set(ds));
    this.svc.getAreas().subscribe(as => this.areas.set(as));
  }

  getRolCfg(rol: string) { return ROL_CONFIG[rol] || { label: rol, class: 'bg-slate-100 text-slate-600', bg: 'bg-slate-500' }; }

  getInitials(nombre: string): string {
    return nombre.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  }

  abrirModal() {
    this.form.reset({ rol: 'Operador' });
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  guardarUsuario() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.errorMsg.set('');

    const v = this.form.value;
    const payload: UsuarioCreate = {
      nombre: v.nombre!,
      email: v.email!,
      password: v.password!,
      rol: v.rol!,
      especialidad: v.especialidad || undefined,
      extension: v.extension || undefined,
      id_departamento: v.id_departamento || undefined,
      id_area_tecnica: v.id_area_tecnica || undefined,
    };

    this.svc.crearUsuario(payload).subscribe({
      next: (nuevo) => {
        this.usuarios.update(us => [nuevo, ...us]);
        this.showModal.set(false);
        this.guardando.set(false);
        this.toast.success('Usuario creado', `${nuevo.nombre} fue agregado al sistema`);
      },
      error: (err) => {
        this.guardando.set(false);
        const detail = err.error?.detail;
        if (Array.isArray(detail)) {
          this.errorMsg.set(detail.map((d: any) => d.msg).join('. '));
        } else {
          this.errorMsg.set(detail || 'Error al crear usuario');
        }
      },
    });
  }

  // Mejora 4: Soft Delete con confirmación
  toggleActivo(u: Usuario) {
    if (u.activo) {
      // Mostrar modal de confirmación antes de desactivar
      this.confirmarDesactivacion.set(u);
    } else {
      // Activar directamente
      this.procesandoId.set(u.id);
      this.svc.activarUsuario(u.id).subscribe({
        next: (updated) => {
          this.usuarios.update(us => us.map(x => x.id === updated.id ? updated : x));
          this.toast.success('Usuario activado', updated.nombre);
          this.procesandoId.set(null);
        },
        error: () => { this.procesandoId.set(null); this.toast.error('Error', 'No se pudo activar'); },
      });
    }
  }

  ejecutarDesactivacion() {
    const u = this.confirmarDesactivacion();
    if (!u) return;
    this.procesandoId.set(u.id);
    this.confirmarDesactivacion.set(null);

    this.svc.desactivarUsuario(u.id).subscribe({
      next: (updated) => {
        this.usuarios.update(us => us.map(x => x.id === updated.id ? updated : x));
        this.toast.info('Usuario desactivado', `${updated.nombre} — Su historial de tickets se conserva`);
        this.procesandoId.set(null);
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.toast.error('Error', err.error?.detail || 'No se pudo desactivar');
      },
    });
  }
}
