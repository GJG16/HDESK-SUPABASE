import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService, AuditLog } from '../../../services/report.service';
import { SkeletonComponent } from '../../ui/skeleton/skeleton';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './audit-log.component.html'
})
export class AuditLogComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = true;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.reportService.getAuditLogs(30).subscribe({
      next: (res) => {
        this.logs = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando logs de auditoría:', err);
        this.loading = false;
      }
    });
  }
}
