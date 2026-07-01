import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ComentarioTicket, Macro } from '../../../../../models/helpdesk.models';
import { TiempoRelativoPipe } from '../../../../../shared/pipes/tiempo-relativo.pipe';
import { getAvatarInitials } from '../../../../../shared/utils/badge-helpers';

export interface CommentData {
  contenido: string;
  es_nota_interna: boolean;
  file?: File;
}

@Component({
  selector: 'app-ticket-conversation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TiempoRelativoPipe],
  templateUrl: './ticket-conversation.component.html',
})
export class TicketConversationComponent {
  private fb = inject(FormBuilder);

  @Input({ required: true }) comentarios: ComentarioTicket[] = [];
  @Input() macros: Macro[] = [];
  @Input() isAdminOrEspecialista = false;
  @Input() enviando = false;
  
  @Output() enviarComentario = new EventEmitter<CommentData>();

  commentForm = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(3)]],
    es_nota_interna: [false],
  });

  fileAdjunto: File | null = null;
  getAvatar = getAvatarInitials;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileAdjunto = file;
    }
  }

  insertarMacro(m: Macro) {
    const current = this.commentForm.value.contenido || '';
    const newContent = current ? current + '\n\n' + m.contenido : m.contenido;
    this.commentForm.patchValue({ contenido: newContent });
  }

  onSubmit() {
    if (this.commentForm.invalid) return;
    this.enviarComentario.emit({
      contenido: this.commentForm.value.contenido!,
      es_nota_interna: this.commentForm.value.es_nota_interna || false,
      file: this.fileAdjunto || undefined
    });
  }

  resetForm() {
    this.commentForm.reset({ es_nota_interna: false });
    this.fileAdjunto = null;
  }
}
