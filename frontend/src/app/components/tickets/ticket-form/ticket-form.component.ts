import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../models';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.css']
})
export class TicketFormComponent implements OnInit {
  ticketForm: FormGroup;
  loading = false;
  isEditMode = false;
  ticketId: string | null = null;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private ticketService: TicketService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ticketForm = this.formBuilder.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      prioridad: ['media', Validators.required],
      estado: ['abierto', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.ticketId = params['id'];
        this.loadTicket(this.ticketId);
      } else {
        this.isEditMode = false;
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
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar el ticket';
        this.loading = false;
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
      const currentUser = this.authService.getCurrentUser();
      const newTicket = {
        ...formValue,
        usuario_id: currentUser?.id
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
}
