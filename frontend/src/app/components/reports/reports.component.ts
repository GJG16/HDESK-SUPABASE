import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { AuditLog, TicketReport } from '../../models';


@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  loading = true;
  auditLoading = true;
  report: TicketReport | null = null;
  auditLogs: AuditLog[] = [];
  error = '';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadReport();
    this.loadAuditLogs();
  }

  loadReport(): void {
    this.loading = true;
    this.ticketService.getTicketReports().subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = error.error?.detail || 'No fue posible cargar el reporte';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAuditLogs(): void {
    this.auditLoading = true;
    this.ticketService.getAuditLogs(8).subscribe({
      next: (logs) => {
        this.auditLogs = logs;
        this.auditLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = error.error?.detail || 'No fue posible cargar la auditoría';
        this.auditLoading = false;
        this.cdr.detectChanges();
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

  formatAction(action: AuditLog['action']): string {
    return action === 'delete_user' ? 'Eliminó usuario' : 'Eliminó ticket';
  }

  formatResource(log: AuditLog): string {
    if (log.resource_type === 'ticket') {
      return log.resource_label || log.resource_id;
    }

    return log.resource_label || log.resource_id;
  }
}
