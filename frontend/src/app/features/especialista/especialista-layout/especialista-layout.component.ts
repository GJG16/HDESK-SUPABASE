import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-especialista-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, ToastComponent],
  template: `
<div class="min-h-screen bg-[#F3F4F6] flex font-sans antialiased">
  <app-toast></app-toast>

  <!-- Mobile overlay -->
  <div *ngIf="mobileMenuOpen()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" (click)="mobileMenuOpen.set(false)"></div>

  <!-- Sidebar Especialista -->
  <aside class="w-56 bg-white border-r border-slate-100 shadow-sm flex-col shrink-0 fixed md:static inset-y-0 left-0 z-50 transition-transform duration-300"
    [ngClass]="{'hidden md:flex': !mobileMenuOpen(), 'flex': mobileMenuOpen()}">
    <div class="h-16 flex items-center px-5 border-b border-slate-100">
      <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
      </div>
      <div class="ml-2.5">
        <p class="text-sm font-bold text-slate-800 truncate">Conecta BPO</p>
        <p class="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Especialista</p>
      </div>
      <button (click)="mobileMenuOpen.set(false)" class="ml-auto md:hidden text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <nav class="flex-1 p-3 space-y-0.5">
      <a routerLink="/especialista/dashboard" routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold" [routerLinkActiveOptions]="{exact:true}"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        Mi Panel
      </a>
      <a routerLink="/especialista/cola" routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        Cola de Trabajo
        <span *ngIf="notifSvc.noLeidas > 0" class="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{{ notifSvc.noLeidas }}</span>
      </a>
    </nav>
    <div class="border-t border-slate-100 p-3">
      <div class="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
        <div class="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{{ user()?.avatar_initials || 'AM' }}</div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-800 truncate">{{ user()?.nombre }}</p>
          <p class="text-[10px] text-slate-400 truncate">{{ user()?.especialidad }}</p>
        </div>
        <button (click)="logout()" class="text-slate-400 hover:text-red-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </div>
  </aside>

  <main class="flex-1 flex flex-col min-h-screen overflow-y-auto">
    <header class="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10 shrink-0 gap-3">
      <!-- Hamburger -->
      <button (click)="mobileMenuOpen.set(true)" class="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div>
        <h1 class="text-base font-bold text-slate-900">Panel del Especialista</h1>
        <p class="text-xs text-slate-400">{{ user()?.especialidad }} · Conecta Soluciones BPO</p>
      </div>
      <div class="flex items-center gap-2">
        <button (click)="toast.info('Info', 'No tienes notificaciones nuevas')" class="relative p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      </div>
    </header>
    <div class="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full"><router-outlet></router-outlet></div>
  </main>
</div>`,
})
export class EspecialistaLayoutComponent {
  auth     = inject(AuthService);
  toast    = inject(ToastService);
  notifSvc = inject(NotificationService);
  router   = inject(Router);
  user     = this.auth.currentUser;
  mobileMenuOpen = signal(false);
  logout() { this.auth.logout(); }
}
