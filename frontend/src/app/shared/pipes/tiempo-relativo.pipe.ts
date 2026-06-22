import { Pipe, PipeTransform } from '@angular/core';

/** Transforma una fecha ISO en texto relativo: "hace 2 horas", "hace 3 días" */
@Pipe({ name: 'tiempoRelativo', standalone: true, pure: true })
export class TiempoRelativoPipe implements PipeTransform {
  transform(isoString: string | undefined | null): string {
    if (!isoString) return '—';
    const now   = Date.now();
    const past  = new Date(isoString).getTime();
    const diff  = Math.max(0, now - past);

    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (mins  < 1)  return 'Justo ahora';
    if (mins  < 60) return `hace ${mins} min`;
    if (hours < 24) return `hace ${hours} h`;
    if (days  < 7)  return `hace ${days} día${days !== 1 ? 's' : ''}`;
    return new Date(isoString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }
}
