import { Component, inject, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  isLoading  = signal(false);
  errorMsg   = signal('');
  showPass   = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  // Usuarios de demo para acceso rápido (contraseñas reales bcrypt del seed)
  readonly demoUsers = [
    { label: 'Admin',       email: 'admin@conectabpo.co',    pass: 'admin123', color: 'bg-purple-100 text-purple-700' },
    { label: 'Operador',    email: 'operador@conectabpo.co', pass: 'oper123',  color: 'bg-blue-100 text-blue-700' },
    { label: 'Técnico',     email: 'tecnico@conectabpo.co',  pass: 'tech123',  color: 'bg-emerald-100 text-emerald-700' },
  ];

  fillDemo(email: string, pass: string): void {
    this.form.setValue({ email, password: pass });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate([this.auth.getDefaultRoute()]);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.message || 'Error al iniciar sesión');
      },
    });
  }

  get emailCtrl() { return this.form.get('email')!; }
  get passCtrl()  { return this.form.get('password')!; }
}
