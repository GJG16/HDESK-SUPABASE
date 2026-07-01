import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket, EstadoTicket } from '../../../../../models/helpdesk.models';
import {
  getPrioridadBadge, getEstadoBadge, getSemaforoSla, getSlaTextoSemaforo, getSlaIconClass, getAvatarInitials,
} from '../../../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-ticket-properties',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-properties.component.html',
})
export class TicketPropertiesComponent {
  @Input({ required: true }) ticket!: Ticket;
  @Input() isAdminOrEspecialista = false;
  @Output() estadoChange = new EventEmitter<string>();

  estados = Object.values(EstadoTicket);

  cambiarEstado(event: Event) {
    const nuevo = (event.target as HTMLSelectElement).value;
    this.estadoChange.emit(nuevo);
  }

  formatFecha(isoString: string): string {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  getEstadoBadge = getEstadoBadge;
  getPrioridadBadge = getPrioridadBadge;
  getSemaforoSla = getSemaforoSla;
  getSlaTextoSemaforo = getSlaTextoSemaforo;
  getSlaIconClass = getSlaIconClass;
  getAvatar = getAvatarInitials;
}
