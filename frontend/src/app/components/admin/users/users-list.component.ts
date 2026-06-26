import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models';
import { ButtonComponent } from '../../ui/button/button';
import { SkeletonComponent } from '../../ui/skeleton/skeleton';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './users-list.component.html'
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  loading = true;
  page = 1;
  totalPages = 1;
  
  // Variables para la edición rápida de roles
  editingUserId: string | null = null;
  editRoleValue: User['rol'] = 'user';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers(this.page, 20).subscribe({
      next: (res) => {
        this.users = res.items;
        this.totalPages = res.pages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.loading = false;
      }
    });
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadUsers();
    }
  }

  startEditingRole(user: User): void {
    if (user.id) {
      this.editingUserId = user.id;
      this.editRoleValue = user.rol;
    }
  }

  saveRole(user: User): void {
    if (user.id && this.editRoleValue !== user.rol) {
      this.userService.updateUser(user.id, { rol: this.editRoleValue }).subscribe({
        next: () => {
          user.rol = this.editRoleValue;
          this.editingUserId = null;
        },
        error: (err) => {
          alert('Error al actualizar el rol');
          this.editingUserId = null;
        }
      });
    } else {
      this.editingUserId = null;
    }
  }

  deleteUser(user: User): void {
    if (user.id && confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.nombre}?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          alert('Error al eliminar usuario. Es posible que tenga tickets asignados.');
        }
      });
    }
  }
}
