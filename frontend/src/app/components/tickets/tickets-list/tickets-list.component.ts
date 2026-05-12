import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { Ticket, TicketStatus } from '../../models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './tickets-list.component.html',
  styleUrls: ['./tickets-list.component.css']
})
export class TicketsListComponent implements OnInit {
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  loading = true;
  filterEstado = '';
  filterPrioridad = '';
  searchTerm = '';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

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
    this.filteredTickets = this.tickets.filter(ticket => {
      const matchEstado = !this.filterEstado || ticket.estado === this.filterEstado;
      const matchPrioridad = !this.filterPrioridad || ticket.prioridad === this.filterPrioridad;
      const matchSearch = !this.searchTerm || 
        ticket.titulo.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchEstado && matchPrioridad && matchSearch;
    });
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
}
