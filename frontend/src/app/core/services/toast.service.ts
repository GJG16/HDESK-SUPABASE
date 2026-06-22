import { Injectable, signal } from '@angular/core';


export interface Toast {
  id:      number;
  titulo:  string;
  mensaje: string;
  tipo:    'success' | 'warning' | 'error' | 'info';
}

let toastId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(titulo: string, mensaje = ''): void { this._push('success', titulo, mensaje); }
  error  (titulo: string, mensaje = ''): void { this._push('error',   titulo, mensaje); }
  warning(titulo: string, mensaje = ''): void { this._push('warning', titulo, mensaje); }
  info   (titulo: string, mensaje = ''): void { this._push('info',    titulo, mensaje); }

  dismiss(id: number): void {
    this._toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private _push(tipo: Toast['tipo'], titulo: string, mensaje: string): void {
    const id = toastId++;
    this._toasts.update(ts => [...ts.slice(-2), { id, tipo, titulo, mensaje }]);
    setTimeout(() => this.dismiss(id), 4200);
  }
}
