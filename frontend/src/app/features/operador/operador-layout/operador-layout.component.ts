import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-operador-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, ToastComponent],
  template: `
<div class="min-h-screen bg-[#F3F4F6] flex font-sans antialiased">
  <app-toast></app-toast>

  <!-- Mobile overlay -->
  <div *ngIf="mobileMenuOpen()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" (click)="mobileMenuOpen.set(false)"></div>

  <!-- Sidebar Operador -->
  <aside class="w-56 bg-white border-r border-slate-100 shadow-sm flex-col shrink-0 fixed md:static inset-y-0 left-0 z-50 transition-transform duration-300"
    [ngClass]="{'hidden md:flex': !mobileMenuOpen(), 'flex': mobileMenuOpen()}">
    <!-- Logo -->
    <div class="h-16 flex items-center px-5 border-b border-slate-100">
      <div class="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center shadow-sm shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div class="ml-2.5 overflow-hidden">
        <p class="text-sm font-bold text-slate-800 truncate">Conecta BPO</p>
        <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Operador</p>
      </div>
      <button (click)="mobileMenuOpen.set(false)" class="ml-auto md:hidden text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <!-- Nav -->
    <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
      <a routerLink="/operador/dashboard" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" [routerLinkActiveOptions]="{exact:true}"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        Mi Panel
      </a>
      <a routerLink="/operador/mis-tickets" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Mis Tickets
      </a>
      <a routerLink="/operador/nuevo-ticket" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nuevo Ticket
      </a>
    </nav>
    <!-- Perfil -->
    <div class="border-t border-slate-100 p-3">
      <div class="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
        <div class="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {{ user()?.avatar_initials || 'OP' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-800 truncate">{{ user()?.nombre }}</p>
          <p class="text-[10px] text-slate-400 truncate">Ext. {{ user()?.extension }}</p>
        </div>
        <button (click)="logout()" title="Cerrar sesión" class="text-slate-400 hover:text-red-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main class="flex-1 flex flex-col min-h-screen overflow-y-auto">
    <!-- Navbar -->
    <header class="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10 shrink-0 gap-3">
      <!-- Hamburger -->
      <button (click)="mobileMenuOpen.set(true)" class="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <div>
        <h1 class="text-base font-bold text-slate-900">Panel del Operador</h1>
        <p class="text-xs text-slate-400">Conecta Soluciones BPO</p>
      </div>
      <div class="flex items-center gap-2">
        <button (click)="toast.info('Info', 'No tienes notificaciones nuevas')" class="relative p-2.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span *ngIf="notifSvc.noLeidas > 0" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
        </button>
        <a routerLink="/operador/nuevo-ticket"
          class="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-500/25">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span class="hidden sm:inline">Nuevo Ticket</span>
        </a>
      </div>
    </header>
    <div class="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <router-outlet></router-outlet>
    </div>
  </main>
</div>`,
})
export class OperadorLayoutComponent {
  auth     = inject(AuthService);
  notifSvc = inject(NotificationService);
  toast    = inject(ToastService);
  router   = inject(Router);
  user     = this.auth.currentUser;
  mobileMenuOpen = signal(false);
  logout() { this.auth.logout(); }
}
