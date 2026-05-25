import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const requiredRole = route.data['role'];
    const allowedRoles = route.data['roles'] as string[] | undefined;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (requiredRole || allowedRoles) {
      const currentUser = this.authService.getCurrentUser();
      const hasAccess = !!currentUser && (
        (requiredRole ? currentUser.rol === requiredRole : false) ||
        (allowedRoles ? allowedRoles.includes(currentUser.rol) : false)
      );

      if (!hasAccess) {
        this.router.navigate(['/dashboard']);
        return false;
      }
    }

    return true;
  }
}
