import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { 
        path: 'tickets', 
        loadComponent: () => import('./components/tickets/tickets-list/tickets-list.component').then(m => m.TicketsListComponent)
      },
      { 
        path: 'tickets/kanban', 
        loadComponent: () => import('./components/tickets/kanban/kanban.component').then(m => m.KanbanComponent), 
        data: { roles: ['admin', 'agent'] } 
      },
      { path: 'tickets/new', loadComponent: () => import('./components/tickets/ticket-form/ticket-form.component').then(m => m.TicketFormComponent), data: { animation: 'TicketFormPage' } },
      { path: 'tickets/:id', loadComponent: () => import('./components/tickets/ticket-form/ticket-form.component').then(m => m.TicketFormComponent), data: { animation: 'TicketFormPage' } },
      
      // Knowledge Base
      { path: 'kb', loadComponent: () => import('./components/kb/kb-list.component').then(m => m.KbListComponent), data: { animation: 'KbListPage' } },
      { path: 'kb/:id', loadComponent: () => import('./components/kb/kb-article.component').then(m => m.KbArticleComponent), data: { animation: 'KbArticlePage' } },
      
      // Admin
      { path: 'admin/users', loadComponent: () => import('./components/admin/users/users-list.component').then(m => m.UsersListComponent), data: { roles: ['admin'], animation: 'UsersPage' } },
      { path: 'admin/audit', loadComponent: () => import('./components/admin/audit/audit-log.component').then(m => m.AuditLogComponent), data: { roles: ['admin'], animation: 'AuditPage' } },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
