import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../../models/helpdesk.models';

/**
 * roleGuard — Factory que verifica si el usuario tiene el rol requerido.
 * Uso en routes: canActivate: [authGuard, roleGuard(RolUsuario.ADMINISTRADOR)]
 */
export const roleGuard = (requiredRole: RolUsuario): CanActivateFn => {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(requiredRole)) return true;

    // Si está autenticado pero con otro rol → redirigir a su dashboard
    const defaultRoute = auth.getDefaultRoute();
    router.navigate([defaultRoute]);
    return false;
  };
};
