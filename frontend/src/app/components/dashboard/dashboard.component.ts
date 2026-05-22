import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { User, Ticket } from '../../models';

import { TicketCreateModalComponent } from '../tickets/ticket-create-modal/ticket-create-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TicketCreateModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  isModalOpen = false;
  currentUser: User | null = null;
  tickets: Ticket[] = [];
  loading = true;
  currentRole: User['rol'] | null = null;
  stats = {
    total: 0,
    abiertos: 0,
    en_progreso: 0,
    resueltos: 0,
    cerrados: 0
  };

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.currentRole = this.authService.getCurrentRole();
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets.slice(0, 5); // Últimos 5 tickets
        this.calculateStats(tickets);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar tickets:', error);
        this.loading = false;
      }
    });
  }

  calculateStats(tickets: Ticket[]): void {
    this.stats.total = tickets.length;
    this.stats.abiertos = tickets.filter(t => t.estado === 'abierto').length;
    this.stats.en_progreso = tickets.filter(t => t.estado === 'en_progreso').length;
    this.stats.resueltos = tickets.filter(t => t.estado === 'resuelto').length;
    this.stats.cerrados = tickets.filter(t => t.estado === 'cerrado').length;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isAgent(): boolean {
    return this.authService.isAgent();
  }

  isUser(): boolean {
    return this.authService.isUser();
  }
}
