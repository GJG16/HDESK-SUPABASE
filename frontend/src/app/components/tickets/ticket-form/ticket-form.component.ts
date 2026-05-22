import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { UsuariosService } from '../../../services/usuarios.service';
import { Ticket, User, TicketComment } from '../../../models';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.css']
})
export class TicketFormComponent implements OnInit {
  ticketForm: FormGroup;
  loading = false;
  isEditMode = false;
  ticketId: string | null = null;
  error = '';
  currentUser: User | null = null;
  usuarios: User[] = [];
  
  comments: TicketComment[] = [];
  newCommentTexto = '';
  submittingComment = false;

  constructor(
    private formBuilder: FormBuilder,
    private ticketService: TicketService,
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ticketForm = this.formBuilder.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      prioridad: ['media', Validators.required],
      estado: ['abierto', Validators.required],
      usuario_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.authService.isAdmin()) {
      this.usuariosService.getUsuarios().subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
        }
      });
    } else if (this.currentUser?.id) {
      this.ticketForm.patchValue({ usuario_id: this.currentUser.id });
    }

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.ticketId = params['id'];
        this.loadTicket(params['id']);
        this.loadComments(params['id']);
      }
    });
  }

  loadTicket(id: string): void {
    this.loading = true;
    this.ticketService.getTicket(id).subscribe({
      next: (ticket) => {
        this.ticketForm.patchValue({
          titulo: ticket.titulo,
          descripcion: ticket.descripcion,
          prioridad: ticket.prioridad,
          estado: ticket.estado
        });
        
        // Disable for users
        if (!this.isAdmin() && !this.authService.isAgent()) {
          this.ticketForm.disable();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar el ticket';
        this.loading = false;
      }
    });
  }

  loadComments(id: string): void {
    this.ticketService.getComments(id).subscribe({
      next: (comments) => this.comments = comments,
      error: (err) => console.error('Error al cargar comentarios:', err)
    });
  }

  submitComment(): void {
    if (!this.newCommentTexto.trim() || !this.ticketId) return;
    this.submittingComment = true;
    this.ticketService.addComment(this.ticketId, this.newCommentTexto).subscribe({
      next: (comment) => {
        this.comments.push(comment);
        this.newCommentTexto = '';
        this.submittingComment = false;
      },
      error: (err) => {
        console.error('Error enviando comentario:', err);
        this.submittingComment = false;
      }
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const formValue = this.ticketForm.value;

    if (this.isEditMode && this.ticketId) {
      this.ticketService.updateTicket(this.ticketId, formValue).subscribe({
        next: () => {
          this.router.navigate(['/tickets']);
        },
        error: (error) => {
          this.error = error.error?.detail || 'Error al actualizar el ticket';
          this.loading = false;
        }
      });
    } else {
      const newTicket = {
        ...formValue,
        usuario_id: this.authService.isAdmin() ? formValue.usuario_id : this.currentUser?.id
      };
      this.ticketService.createTicket(newTicket).subscribe({
        next: () => {
          this.router.navigate(['/tickets']);
        },
        error: (error) => {
          this.error = error.error?.detail || 'Error al crear el ticket';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/tickets']);
  }

  get f() {
    return this.ticketForm.controls;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
