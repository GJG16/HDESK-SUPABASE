import { Injectable, signal } from '@angular/core';
export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  leida: boolean;
  fecha: string;
}
let notifId = 1;

const MOCK_NOTIFICACIONES: Notificacion[] = [
  { id: notifId++, titulo: 'Ticket #2045 actualizado', mensaje: 'Andrés Molina cambió el estado a "En Proceso"', tipo: 'info', leida: false, fecha: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: notifId++, titulo: 'SLA en riesgo', mensaje: 'El ticket #2038 vence en 30 minutos', tipo: 'warning', leida: false, fecha: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: notifId++, titulo: 'Ticket #2042 Resuelto', mensaje: 'Laura Pérez marcó el ticket como Resuelto', tipo: 'success', leida: true, fecha: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: notifId++, titulo: 'Error de sistema', mensaje: 'El servicio de correo no está disponible', tipo: 'error', leida: true, fecha: new Date(Date.now() - 2 * 3600000).toISOString() },
];

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private _notificaciones = signal<Notificacion[]>(MOCK_NOTIFICACIONES);
  readonly notificaciones = this._notificaciones.asReadonly();

  get noLeidas(): number {
    return this._notificaciones().filter(n => !n.leida).length;
  }

  marcarLeida(id: number): void {
    this._notificaciones.update(ns =>
      ns.map(n => n.id === id ? { ...n, leida: true } : n)
    );
  }

  marcarTodasLeidas(): void {
    this._notificaciones.update(ns => ns.map(n => ({ ...n, leida: true })));
  }

  /** Añade una notificación en tiempo real (llamado desde otros servicios) */
  push(notif: Omit<Notificacion, 'id' | 'leida' | 'fecha'>): void {
    const nueva: Notificacion = {
      ...notif, id: notifId++, leida: false,
      fecha: new Date().toISOString(),
    };
    this._notificaciones.update(ns => [nueva, ...ns]);
  }
}
