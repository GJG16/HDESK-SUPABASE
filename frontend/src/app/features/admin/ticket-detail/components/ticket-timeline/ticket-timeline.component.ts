import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistorialTicket } from '../../../../../models/helpdesk.models';
import { TiempoRelativoPipe } from '../../../../../shared/pipes/tiempo-relativo.pipe';

@Component({
  selector: 'app-ticket-timeline',
  standalone: true,
  imports: [CommonModule, TiempoRelativoPipe],
  templateUrl: './ticket-timeline.component.html',
})
export class TicketTimelineComponent {
  @Input({ required: true }) historial: HistorialTicket[] = [];
}
