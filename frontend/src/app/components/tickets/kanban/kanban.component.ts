import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TicketService } from '../../../services/ticket.service';
import { Ticket, User } from '../../../models';

interface KanbanColumn {
  key: Ticket['estado'];
  label: string;
  tickets: Ticket[];
}

@Component({
  selector: 'app-ticket-kanban',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.css']
})
export class KanbanComponent implements OnInit {
  currentUser: User | null = null;
  loading = true;
  error = '';
  tickets: Ticket[] = [];
  columns: KanbanColumn[] = [
    { key: 'abierto', label: 'Pendiente', tickets: [] },
    { key: 'en_progreso', label: 'En Proceso', tickets: [] },
    { key: 'resuelto', label: 'Resuelto', tickets: [] },
    { key: 'cerrado', label: 'Cerrado', tickets: [] },
  ];

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    if (!this.authService.isAgent() && !this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.groupTickets();
        this.loading = false;
      },
      error: () => {
        this.error = 'No fue posible cargar el tablero';
        this.loading = false;
      }
    });
  }

  groupTickets(): void {
    this.columns = this.columns.map((column) => ({
      ...column,
      tickets: this.tickets.filter((ticket) => ticket.estado === column.key),
    }));
  }

  dragStart(event: DragEvent, ticket: Ticket): void {
    event.dataTransfer?.setData('text/plain', ticket.id || '');
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  drop(event: DragEvent, targetState: Ticket['estado']): void {
    event.preventDefault();
    const ticketId = event.dataTransfer?.getData('text/plain');
    if (!ticketId) {
      return;
    }

    const ticket = this.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      return;
    }

    this.moveTicket(ticket, targetState);
  }

  moveTicket(ticket: Ticket, targetState: Ticket['estado']): void {
    if (!ticket.id) {
      return;
    }

    const payload: Partial<Ticket> = { estado: targetState };
    if (this.authService.isAgent() && ticket.asignado_a !== this.currentUser?.id) {
      payload.asignado_a = this.currentUser?.id;
    }

    this.ticketService.updateTicket(ticket.id, payload).subscribe({
      next: () => this.loadTickets(),
      error: () => {
        this.error = 'No fue posible actualizar el ticket';
      }
    });
  }

  assignToMe(ticket: Ticket): void {
    if (!ticket.id || !this.currentUser?.id) {
      return;
    }

    this.ticketService.updateTicket(ticket.id, { asignado_a: this.currentUser.id }).subscribe({
      next: () => this.loadTickets(),
      error: () => {
        this.error = 'No fue posible asignar el ticket';
      }
    });
  }

  canDrag(ticket: Ticket): boolean {
    return this.authService.isAdmin() || this.authService.isAgent();
  }

  canSelfAssign(ticket: Ticket): boolean {
    return this.authService.isAgent() && ticket.asignado_a !== this.currentUser?.id;
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isAgent(): boolean {
    return this.authService.isAgent();
  }
}
