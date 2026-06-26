import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ChildrenOutletContexts, Router } from '@angular/router';
import { routeTransitionAnimations } from '../../animations/route-animations';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  animations: [routeTransitionAnimations]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isNotificationsOpen = false;
  activeToasts: AppNotification[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private contexts: ChildrenOutletContexts,
    public authService: AuthService,
    public notificationService: NotificationService,
    private router: Router
  ) {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        // Añadir a los toasts activos y quitarlo después de 5 segundos
        this.activeToasts.unshift(notification);
        setTimeout(() => {
          this.removeToast(notification.id);
        }, 5000);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  markAsReadAndNavigate(notif: AppNotification): void {
    this.notificationService.markAsRead(notif.id);
    this.isNotificationsOpen = false;
    this.router.navigate(['/tickets', notif.ticket_id]);
  }

  removeToast(id: string): void {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'] || this.contexts.getContext('primary')?.route?.snapshot?.url;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
