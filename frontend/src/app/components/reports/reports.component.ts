import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';

interface TicketReportByState {
  estado: string;
  total: number;
}

interface TicketReportByAgent {
  asignado_a: string;
  total: number;
}

interface TicketReport {
  total_tickets: number;
  by_state: TicketReportByState[];
  by_agent: TicketReportByAgent[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  loading = true;
  report: TicketReport | null = null;
  error = '';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.ticketService.getTicketReports().subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.detail || 'No fue posible cargar el reporte';
        this.loading = false;
      }
    });
  }

  downloadJson(): void {
    if (!this.report) {
      return;
    }

    const blob = new Blob([JSON.stringify(this.report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reporte-ticket.json';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
