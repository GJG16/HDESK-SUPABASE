import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../../services/ticket.service';
import { Ticket } from '../../../models';

@Component({
  selector: 'app-ticket-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-create-modal.component.html',
  styleUrls: ['./ticket-create-modal.component.css']
})
export class TicketCreateModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() ticketCreated = new EventEmitter<Ticket>();

  ticketForm: FormGroup;
  loading = false;
  error = '';
  showSuccessAnimation = false;

  constructor(
    private formBuilder: FormBuilder,
    private ticketService: TicketService
  ) {
    this.ticketForm = this.formBuilder.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {}

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const newTicket = {
      ...this.ticketForm.value,
      prioridad: 'media', // Default forced for frontend display logic
      estado: 'abierto'
    };

    this.ticketService.createTicket(newTicket).subscribe({
      next: (ticket) => {
        this.loading = false;
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.ticketCreated.emit(ticket);
          this.close.emit();
        }, 1200); // Wait for animation
      },
      error: (error) => {
        this.error = 'Ocurrió un error al crear el ticket.';
        this.loading = false;
        console.error('Error creating ticket:', error);
      }
    });
  }
}
