import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let t of toastSvc.toasts(); trackBy: trackById"
        class="pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-sm
               bg-white border rounded-2xl shadow-xl p-4 animate-slide-in"
        [ngClass]="{
          'border-emerald-200 shadow-emerald-100': t.tipo === 'success',
          'border-red-200    shadow-red-100':      t.tipo === 'error',
          'border-amber-200  shadow-amber-100':    t.tipo === 'warning',
          'border-blue-200   shadow-blue-100':     t.tipo === 'info'
        }">

        <!-- Ícono -->
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          [ngClass]="{
            'bg-emerald-100 text-emerald-600': t.tipo === 'success',
            'bg-red-100     text-red-600':     t.tipo === 'error',
            'bg-amber-100   text-amber-600':   t.tipo === 'warning',
            'bg-blue-100    text-blue-600':    t.tipo === 'info'
          }">
          <!-- Success -->
          <svg *ngIf="t.tipo==='success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <!-- Error -->
          <svg *ngIf="t.tipo==='error'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <!-- Warning -->
          <svg *ngIf="t.tipo==='warning'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <!-- Info -->
          <svg *ngIf="t.tipo==='info'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <!-- Texto -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-900">{{ t.titulo }}</p>
          <p *ngIf="t.mensaje" class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ t.mensaje }}</p>
        </div>

        <!-- Cerrar -->
        <button (click)="toastSvc.dismiss(t.id)"
          class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(100%) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }
    .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.22,0.61,0.36,1) forwards; }
  `],
})
export class ToastComponent {
  toastSvc = inject(ToastService);
  trackById = (_: number, t: Toast) => t.id;
}
