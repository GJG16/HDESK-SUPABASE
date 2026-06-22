import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { RolUsuario } from './models/helpdesk.models';

export const routes: Routes = [

  // ─── Redireccion raíz ──────────────────────────────────────────────────────
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // ─── Login ─────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // ─── ADMINISTRADOR ──────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard(RolUsuario.ADMINISTRADOR)],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/admin/tickets/admin-tickets.component').then(m => m.AdminTicketsComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./features/admin/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/admin/usuarios/admin-usuarios.component').then(m => m.AdminUsuariosComponent),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/reportes/admin-reportes.component').then(m => m.AdminReportesComponent),
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/admin/auditoria/admin-auditoria.component').then(m => m.AdminAuditoriaComponent),
      },
      {
        path: 'kb',
        loadComponent: () => import('./features/admin/kb/kb-admin.component').then(m => m.KbAdminComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/admin/config/admin-config.component').then(m => m.AdminConfigComponent),
      },
    ],
  },

  // ─── OPERADOR ───────────────────────────────────────────────────────────────
  {
    path: 'operador',
    loadComponent: () => import('./features/operador/operador-layout/operador-layout.component').then(m => m.OperadorLayoutComponent),
    canActivate: [authGuard, roleGuard(RolUsuario.OPERADOR)],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/operador/dashboard/operador-dashboard.component').then(m => m.OperadorDashboardComponent),
      },
      {
        path: 'mis-tickets',
        loadComponent: () => import('./features/operador/mis-tickets/mis-tickets.component').then(m => m.MisTicketsComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./features/admin/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
      },
      {
        path: 'nuevo-ticket',
        loadComponent: () => import('./features/operador/nuevo-ticket/nuevo-ticket.component').then(m => m.NuevoTicketComponent),
      },
    ],
  },

  // ─── ESPECIALISTA ───────────────────────────────────────────────────────────
  {
    path: 'especialista',
    loadComponent: () => import('./features/especialista/especialista-layout/especialista-layout.component').then(m => m.EspecialistaLayoutComponent),
    canActivate: [authGuard, roleGuard(RolUsuario.ESPECIALISTA)],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/especialista/dashboard/especialista-dashboard.component').then(m => m.EspecialistaDashboardComponent),
      },
      {
        path: 'cola',
        loadComponent: () => import('./features/especialista/cola-trabajo/cola-trabajo.component').then(m => m.ColaTrabajoComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./features/admin/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
      },
    ],
  },

  // ─── Página no autorizada ─────────────────────────────────────────────────
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // ─── Catch all → login ───────────────────────────────────────────────────
  { path: '**', redirectTo: 'login' },
];
