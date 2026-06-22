/**
 * badge-helpers.ts — Funciones utilitarias compartidas para badges de UI v2.0
 *
 * Centraliza la lógica de colores/clases CSS que antes estaba duplicada
 * en 5+ componentes del sistema.
 *
 * Mejora 5: Semáforo SLA basado en tiempo transcurrido desde creación.
 */

import { Ticket } from '../../models/helpdesk.models';

// ─── Badges de Prioridad ────────────────────────────────────

/** Retorna las clases CSS para el badge de prioridad */
export function getPrioridadClass(p: string): string {
  if (p === 'Alta' || p === 'Critica') return 'bg-red-100 text-red-700';
  if (p === 'Media') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

/** Retorna las clases CSS para el badge de prioridad con borde */
export function getPrioridadBadge(p: string): string {
  if (p === 'Alta' || p === 'Critica') return 'bg-red-100 text-red-700 border border-red-200';
  if (p === 'Media') return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

// ─── Badges de Estado ───────────────────────────────────────

/** Retorna las clases CSS para el badge de estado */
export function getEstadoClass(e: string): string {
  if (e === 'Resuelto')   return 'bg-emerald-100 text-emerald-700';
  if (e === 'En Proceso') return 'bg-amber-100 text-amber-700';
  if (e === 'Cancelado')  return 'bg-red-100 text-red-600';
  return 'bg-slate-100 text-slate-600';
}

/** Retorna las clases CSS para el badge de estado completo (con borde) */
export function getEstadoBadge(e: string): string {
  const map: Record<string, string> = {
    'Resuelto':   'bg-emerald-100 text-emerald-700',
    'En Proceso': 'bg-amber-100 text-amber-700',
    'Pendiente':  'bg-slate-100 text-slate-600',
    'Cancelado':  'bg-red-100 text-red-600',
  };
  return map[e] ?? 'bg-slate-100 text-slate-600';
}

// ─── Semáforo SLA — Tiempo Transcurrido (Mejora 5) ──────────

/**
 * Calcula las horas transcurridas desde la creación del ticket.
 */
export function getHorasTranscurridas(t: Ticket): number {
  if (!t.fecha_creacion) return 0;
  const creacion = new Date(t.fecha_creacion).getTime();
  const ahora = Date.now();
  return (ahora - creacion) / 3600000; // ms → horas
}

/**
 * Determina el estado del semáforo SLA:
 * - 'verde'    → < 1 hora sin atención
 * - 'amarillo' → entre 1 y 4 horas sin atención
 * - 'rojo'     → > 4 horas sin atención (Alerta SLA)
 */
export function getSemaforoSla(t: Ticket): 'verde' | 'amarillo' | 'rojo' {
  // Solo aplica a tickets activos (Pendiente o En Proceso)
  if (t.estado === 'Resuelto' || t.estado === 'Cancelado') return 'verde';

  const horas = getHorasTranscurridas(t);
  if (horas > 4)  return 'rojo';
  if (horas >= 1) return 'amarillo';
  return 'verde';
}

/**
 * Retorna las clases CSS de fondo para la fila según el semáforo SLA.
 */
export function getSlaRowClass(t: Ticket): string {
  const semaforo = getSemaforoSla(t);
  if (semaforo === 'rojo')     return 'bg-red-50/60 border-l-4 border-l-red-500';
  if (semaforo === 'amarillo') return 'bg-amber-50/40 border-l-4 border-l-amber-400';
  return '';
}

/**
 * Retorna la clase del ícono de semáforo.
 */
export function getSlaIconClass(t: Ticket): string {
  const semaforo = getSemaforoSla(t);
  if (semaforo === 'rojo')     return 'text-red-500';
  if (semaforo === 'amarillo') return 'text-amber-500';
  return 'text-emerald-500';
}

/**
 * Retorna el texto del semáforo SLA.
 */
export function getSlaTextoSemaforo(t: Ticket): string {
  if (t.estado === 'Resuelto' || t.estado === 'Cancelado') return '—';
  const horas = getHorasTranscurridas(t);
  if (horas < 1) {
    const mins = Math.floor(horas * 60);
    return `${mins}m`;
  }
  return `${horas.toFixed(1)}h`;
}

// ─── Helpers de UI ──────────────────────────────────────────

/** Genera iniciales de avatar a partir de un nombre completo */
export function getAvatarInitials(nombre: string): string {
  const parts = nombre.trim().split(' ');
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

/** Clase de la barra de carga del técnico */
export function getCargaBarClass(carga: number): string {
  return carga >= 8 ? 'bg-red-400' : carga >= 5 ? 'bg-amber-400' : 'bg-emerald-400';
}

/** Clase de tendencia (positiva/negativa) */
export function getTrendClass(val: number): string {
  return val >= 0 ? 'text-emerald-500' : 'text-red-500';
}

/** Signo de tendencia */
export function getTrendSign(val: number): string {
  return val >= 0 ? '+' : '';
}
