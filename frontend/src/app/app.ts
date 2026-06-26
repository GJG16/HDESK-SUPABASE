import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NotificationService, AppNotification } from './services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    
    <div class="toast-container">
      <div *ngFor="let toast of activeToasts" class="toast" [class]="toast.type">
        <div class="toast-icon">
          <svg *ngIf="toast.type === 'TICKET_CREATED'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          <svg *ngIf="toast.type === 'TICKET_UPDATED'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg *ngIf="toast.type === 'NEW_COMMENT'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </div>
        <div class="toast-content">
          <strong>Notificación</strong>
          <p>{{ toast.message }}</p>
        </div>
        <button class="toast-close" (click)="dismiss(toast.id)">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  title = 'helpdesk-frontend';
  activeToasts: AppNotification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.notifications$.subscribe(notification => {
      this.activeToasts.push(notification);
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        this.dismiss(notification.id);
      }, 5000);
    });
  }

  dismiss(id: string) {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
  }
}
