import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TicketsService } from '../../../services/tickets.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, ToastComponent, TiempoRelativoPipe],
  template: `
<div class="min-h-screen bg-[#F3F4F6] flex font-sans antialiased">
  <app-toast></app-toast>

  <!-- Mobile overlay -->
  <div *ngIf="mobileMenuOpen()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" (click)="mobileMenuOpen.set(false)"></div>

  <!-- Sidebar Admin -->
  <aside class="w-56 bg-white border-r border-slate-100 shadow-sm flex-col shrink-0 fixed md:static inset-y-0 left-0 z-50 transition-transform duration-300"
    [ngClass]="{
      'hidden md:flex': !mobileMenuOpen(),
      'flex': mobileMenuOpen()
    }">
    <div class="h-16 flex items-center px-5 border-b border-slate-100">
      <div class="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center shadow-sm shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div class="ml-2.5"><p class="text-sm font-bold text-slate-800">Conecta BPO</p><p class="text-[10px] text-[#2563EB] font-semibold uppercase tracking-wide">Admin</p></div>
      <!-- Close button (mobile) -->
      <button (click)="mobileMenuOpen.set(false)" class="ml-auto md:hidden text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <nav class="flex-1 p-3 overflow-y-auto">
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-1 mt-1">Principal</p>
      <a routerLink="/admin/dashboard" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" [routerLinkActiveOptions]="{exact:true}" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke-width="2"/></svg>
        Dashboard
      </a>
      <a routerLink="/admin/tickets" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Todos los Tickets
        <span *ngIf="ticketCount() > 0" class="ml-auto bg-[#2563EB] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{{ ticketCount() }}</span>
      </a>
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-1 mt-3">Equipo</p>
      <a routerLink="/admin/usuarios" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        Usuarios
      </a>
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-1 mt-3">Análisis</p>
      <a routerLink="/admin/reportes" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        Reportes
      </a>
      <a routerLink="/admin/auditoria" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Auditoría
      </a>
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-1 mt-3">Contenido</p>
      <a routerLink="/admin/kb" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        Base de Conocimientos
      </a>
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-1 mt-3">Sistema</p>
      <a routerLink="/admin/configuracion" routerLinkActive="bg-blue-50 text-[#2563EB] font-semibold" class="nav-item" (click)="mobileMenuOpen.set(false)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
        Configuración
      </a>
    </nav>
    <div class="border-t border-slate-100 p-3">
      <div class="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
        <div class="w-8 h-8 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center shrink-0">{{ user()?.avatar_initials || 'AD' }}</div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-800 truncate">{{ user()?.nombre }}</p>
          <p class="text-[10px] text-slate-400 truncate">Administrador</p>
        </div>
        <button (click)="logout()" class="text-slate-400 hover:text-red-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main class="flex-1 flex flex-col min-h-screen overflow-y-auto">
    <header class="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10 shrink-0 gap-3">
      <!-- Hamburger (mobile) -->
      <button (click)="mobileMenuOpen.set(true)" class="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <!-- Search Bar -->
      <div class="relative flex-1 max-w-md hidden sm:block">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" [(ngModel)]="globalSearch" (keyup.enter)="onGlobalSearch()"
          placeholder="Buscar tickets por ID, título..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all">
      </div>

      <div class="flex items-center gap-2">
        <!-- Campana con panel -->
        <div class="relative">
          <button (click)="notifPanel.set(!notifPanel())" id="btn-notif"
            class="relative p-2.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span *ngIf="notifSvc.noLeidas > 0" class="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white animate-pulse">{{ notifSvc.noLeidas }}</span>
          </button>
          <!-- Panel notificaciones -->
          <div *ngIf="notifPanel()"
            class="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">Notificaciones</p>
              <button (click)="notifSvc.marcarTodasLeidas(); notifPanel.set(false)" class="text-xs text-[#2563EB] font-semibold hover:underline">Marcar todas leídas</button>
            </div>
            <div class="max-h-72 overflow-y-auto divide-y divide-slate-50">
              <div *ngFor="let n of notifSvc.notificaciones()" (click)="notifSvc.marcarLeida(n.id)"
                class="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                [ngClass]="{'bg-blue-50/30': !n.leida}">
                <span class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  [ngClass]="{'bg-emerald-500':n.tipo==='success','bg-amber-500':n.tipo==='warning','bg-red-500':n.tipo==='error','bg-blue-500':n.tipo==='info'}"></span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800">{{ n.titulo }}</p>
                  <p class="text-xs text-slate-500 truncate">{{ n.mensaje }}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ n.fecha | tiempoRelativo }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <div class="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full"><router-outlet></router-outlet></div>
  </main>
</div>`,
  styles: [`
    .nav-item {
      @apply flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-medium;
    }
  `],
})
export class AdminLayoutComponent implements OnInit {
  auth       = inject(AuthService);
  notifSvc   = inject(NotificationService);
  ticketsSvc = inject(TicketsService);
  router     = inject(Router);
  user       = this.auth.currentUser;
  notifPanel = signal(false);
  mobileMenuOpen = signal(false);
  globalSearch = '';
  ticketCount = signal(0);

  ngOnInit() {
    // Load pending ticket count for sidebar badge
    this.ticketsSvc.getTodos('Pendiente').subscribe(ts => this.ticketCount.set(ts.length));
  }

  onGlobalSearch() {
    if (this.globalSearch.trim()) {
      this.router.navigate(['/admin/tickets'], { queryParams: { q: this.globalSearch.trim() } });
    }
  }

  logout() { this.auth.logout(); }
}
