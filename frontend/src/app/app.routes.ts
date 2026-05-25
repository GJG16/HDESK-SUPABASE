import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TicketsListComponent } from './components/tickets/tickets-list/tickets-list.component';
import { TicketFormComponent } from './components/tickets/ticket-form/ticket-form.component';
import { ReportsComponent } from './components/reports/reports.component';
import { KanbanComponent } from './components/tickets/kanban/kanban.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'tickets', component: TicketsListComponent, canActivate: [AuthGuard] },
  { path: 'tickets/kanban', component: KanbanComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'agent'] } },
  { path: 'tickets/new', component: TicketFormComponent, canActivate: [AuthGuard] },
  { path: 'tickets/:id/edit', component: TicketFormComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard], data: { role: 'admin' } },
  { path: '**', redirectTo: 'login' }
];
