import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../../services/ticket.service';
import { Ticket, TicketStatus, User } from '../../../models';
import { AuthService } from '../../../services/auth.service';
import { TicketCreateModalComponent } from '../ticket-create-modal/ticket-create-modal.component';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TicketCreateModalComponent],
  templateUrl: './tickets-list.component.html',
  styleUrls: ['./tickets-list.component.css']
})
export class TicketsListComponent implements OnInit {
  isModalOpen = false;
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  loading = true;
  filterEstado = '';
  filterPrioridad = '';
  searchTerm = '';
  currentUser: User | null = null;

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar tickets:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    try {
      if (!this.tickets || !Array.isArray(this.tickets)) {
        this.filteredTickets = [];
        return;
      }
      this.filteredTickets = this.tickets.filter(ticket => {
        const matchEstado = !this.filterEstado || ticket.estado === this.filterEstado;
        const matchPrioridad = !this.filterPrioridad || ticket.prioridad === this.filterPrioridad;
        const tituloSeguro = ticket.titulo || '';
        const matchSearch = !this.searchTerm || 
          tituloSeguro.toLowerCase().includes(this.searchTerm.toLowerCase());
        
        return matchEstado && matchPrioridad && matchSearch;
      });
    } catch (e) {
      console.error('Error aplicando filtros:', e);
      this.filteredTickets = [];
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  deleteTicket(id: string | undefined): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este ticket?')) {
      this.ticketService.deleteTicket(id).subscribe({
        next: () => {
          this.loadTickets();
        },
        error: (error) => {
          alert('Error al eliminar el ticket');
        }
      });
    }
  }

  assignToMe(ticket: Ticket): void {
    if (!ticket.id || !this.currentUser?.id) return;

    this.ticketService.updateTicket(ticket.id, { asignado_a: this.currentUser.id }).subscribe({
      next: () => this.loadTickets(),
      error: () => alert('No fue posible asignar el ticket')
    });
  }

  canEditTicket(ticket: Ticket): boolean {
    if (!this.currentUser) {
      return false;
    }

    if (this.authService.isAdmin()) {
      return true;
    }

    if (this.authService.isAgent()) {
      return ticket.asignado_a === this.currentUser.id;
    }

    return ticket.usuario_id === this.currentUser.id;
  }

  canDeleteTicket(ticket: Ticket): boolean {
    return this.authService.isAdmin();
  }

  canSelfAssign(ticket: Ticket): boolean {
    return !!this.currentUser && this.authService.isAgent() && ticket.asignado_a !== this.currentUser.id;
  }

  editTicket(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/tickets', id, 'edit']);
    }
  }

  createTicket(): void {
    this.router.navigate(['/tickets/new']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isAgent(): boolean {
    return this.authService.isAgent();
  }

  goToKanban(): void {
    this.router.navigate(['/tickets/kanban']);
  }
}
