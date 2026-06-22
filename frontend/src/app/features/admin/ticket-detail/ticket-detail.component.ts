import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TicketsService } from '../../../services/tickets.service';
import { DashboardService } from '../../../services/dashboard.service';
import { MacrosService } from '../../../services/macros.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import {
  Ticket, HistorialTicket, ComentarioTicket, EstadoTicket, PatchTicketDto, Usuario, RolUsuario, Macro, Adjunto, CSAT
} from '../../../models/helpdesk.models';
import {
  getPrioridadBadge, getEstadoBadge, getSemaforoSla, getSlaTextoSemaforo, getSlaIconClass, getAvatarInitials,
} from '../../../shared/utils/badge-helpers';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TiempoRelativoPipe],
  template: `
<div class="space-y-5 animate-fade-in" *ngIf="ticket(); else loadingSkeleton">

  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-sm text-slate-400">
    <a [routerLink]="['/', rolePath(), 'dashboard']" class="hover:text-slate-600 transition-colors">Inicio</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <a (click)="goBack()" class="hover:text-slate-600 transition-colors cursor-pointer">Tickets</a>
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <span class="font-semibold text-[#2563EB]">#{{ ticket()!.id }}</span>
  </div>

  <!-- Header -->
  <div class="flex items-start justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-xl font-extrabold text-slate-900 flex items-center gap-2">
        <span class="font-mono text-base text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">#{{ ticket()!.id }}</span>
        {{ ticket()!.titulo }}
      </h2>
      <p class="text-sm text-slate-400 mt-1">Creado {{ ticket()!.fecha_creacion | tiempoRelativo }}</p>
    </div>
    <div class="flex items-center gap-2">
      <button (click)="goBack()"
        class="flex items-center gap-1.5 px-4 py-2 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Volver
      </button>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">

    <!-- Left: Descripción + Comentarios (2/3) -->
    <div class="xl:col-span-2 space-y-5">

      <!-- Descripción -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Descripción
        </h3>
        <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{{ ticket()!.descripcion }}</p>
        <div *ngIf="ticket()!.comentario_resolucion" class="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Resolución</p>
          <p class="text-sm text-emerald-800">{{ ticket()!.comentario_resolucion }}</p>
        </div>

        <!-- Adjuntos -->
        <div *ngIf="adjuntos().length > 0" class="mt-5 border-t border-slate-100 pt-4">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Archivos Adjuntos</h4>
          <div class="flex flex-wrap gap-2">
            <a *ngFor="let a of adjuntos()" [href]="apiUrl + '/' + a.ruta_archivo" target="_blank"
               class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group text-sm">
               <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
               <span class="text-slate-700 font-medium truncate max-w-[150px]">{{ a.nombre_archivo }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Comentarios / Conversación -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Conversación
            <span class="text-xs text-slate-400 font-normal">({{ comentarios().length }})</span>
          </h3>
        </div>

        <!-- Thread de comentarios -->
        <div class="divide-y divide-slate-50 max-h-96 overflow-y-auto">
          <div *ngFor="let c of comentarios()" class="px-6 py-4 hover:bg-slate-50/50 transition-colors"
            [ngClass]="{'bg-amber-50/30 border-l-4 border-l-amber-300': c.es_nota_interna}">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0"
                [ngClass]="{'bg-amber-200 text-amber-700': c.es_nota_interna}">
                {{ getAvatar(c.nombre_usuario || '?') }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-800">{{ c.nombre_usuario || 'Sistema' }}</span>
                    <span *ngIf="c.es_nota_interna" class="text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Nota Interna</span>
                  </div>
                  <span class="text-[10px] text-slate-400 shrink-0">{{ c.fecha | tiempoRelativo }}</span>
                </div>
                <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ c.contenido }}</p>
              </div>
            </div>
          </div>
          <div *ngIf="comentarios().length === 0" class="px-6 py-8 text-center text-sm text-slate-400">
            No hay comentarios aún. Sé el primero en comentar.
          </div>
        </div>

        <!-- Nuevo comentario -->
        <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <!-- Macros (Respuestas Predefinidas) -->
          <div *ngIf="isAdminOrEspecialista() && macros().length > 0" class="mb-3 flex flex-wrap gap-2">
            <button *ngFor="let m of macros()" type="button" (click)="insertarMacro(m)"
              class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors">
              ⚡ {{ m.titulo }}
            </button>
          </div>

          <form [formGroup]="commentForm" (ngSubmit)="enviarComentario()" class="space-y-3">
            <textarea formControlName="contenido" rows="3"
              placeholder="Escribe un comentario o nota interna..."
              class="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none resize-none transition-all">
            </textarea>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2 cursor-pointer" *ngIf="isAdminOrEspecialista()">
                  <input type="checkbox" formControlName="es_nota_interna"
                    class="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300">
                  <span class="text-xs font-medium text-slate-600">Nota interna</span>
                </label>
                
                <label class="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-[#2563EB] transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  <span class="text-xs font-medium">{{ fileAdjunto ? fileAdjunto.name : 'Adjuntar' }}</span>
                  <input type="file" class="hidden" (change)="onFileSelected($event)">
                </label>
                <button *ngIf="fileAdjunto" type="button" (click)="fileAdjunto = null" class="text-xs text-red-500 hover:text-red-700 font-bold">✕</button>
              </div>

              <button type="submit" [disabled]="commentForm.invalid || enviandoComentario()"
                class="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                {{ enviandoComentario() ? 'Enviando...' : 'Enviar' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Timeline / Historial -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Historial de Actividad
        </h3>
        <div class="relative ml-3">
          <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>
          <div *ngFor="let h of historial(); let last = last" class="relative pl-10 pb-5" [class.pb-0]="last">
            <div class="absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
              [ngClass]="{
                'bg-emerald-500': h.estado_nuevo === 'Resuelto',
                'bg-amber-500': h.estado_nuevo === 'En Proceso',
                'bg-blue-500': h.estado_nuevo === 'Pendiente',
                'bg-red-500': h.estado_nuevo === 'Cancelado',
                'bg-slate-400': !h.estado_nuevo
              }">
              <span *ngIf="h.estado_nuevo === 'Resuelto'">✓</span>
              <span *ngIf="h.estado_nuevo === 'En Proceso'">▶</span>
              <span *ngIf="h.estado_nuevo === 'Pendiente'">●</span>
              <span *ngIf="h.estado_nuevo === 'Cancelado'">✕</span>
            </div>
            <div class="bg-slate-50 rounded-xl p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">
                  {{ h.estado_anterior ? h.estado_anterior + ' → ' : '' }}{{ h.estado_nuevo }}
                </span>
                <span class="text-[10px] text-slate-400">{{ h.fecha | tiempoRelativo }}</span>
              </div>
              <p *ngIf="h.nombre_usuario" class="text-xs text-slate-500 mt-1">👤 {{ h.nombre_usuario }}</p>
              <p *ngIf="h.comentario" class="text-xs text-slate-600 mt-1 italic">{{ h.comentario }}</p>
            </div>
          </div>
          <div *ngIf="historial().length === 0" class="pl-10 py-4 text-sm text-slate-400">
            No hay historial registrado
          </div>
        </div>
      </div>
      <!-- CSAT / Calificación -->
      <div *ngIf="ticket()!.estado === 'Resuelto'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-5">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            Satisfacción del Cliente (CSAT)
          </h3>
        </div>
        
        <div class="p-6">
          <div *ngIf="csat() as c; else formCsat" class="flex flex-col items-center justify-center text-center">
            <div class="flex items-center gap-1 mb-2">
              <svg *ngFor="let star of [1,2,3,4,5]" class="w-8 h-8" [ngClass]="star <= c.calificacion ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>
            <p class="text-sm font-bold text-slate-800">{{ c.calificacion }} de 5 estrellas</p>
            <p *ngIf="c.comentario" class="text-sm text-slate-500 italic mt-2">"{{ c.comentario }}"</p>
          </div>

          <ng-template #formCsat>
            <div *ngIf="isOperador()" class="text-center">
              <p class="text-sm text-slate-600 mb-4">El ticket ha sido resuelto. ¿Cómo calificarías la atención recibida?</p>
              <div class="flex justify-center gap-2 mb-4">
                <button *ngFor="let star of [1,2,3,4,5]" (click)="calificacion.set(star)" class="focus:outline-none transition-transform hover:scale-110">
                  <svg class="w-10 h-10" [ngClass]="star <= calificacion() ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </button>
              </div>
              <textarea [formControl]="csatCommentControl" rows="2" placeholder="Opcional: Deja un comentario sobre el servicio..." class="w-full max-w-md px-3 py-2 border border-slate-200 rounded-xl text-sm mb-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"></textarea>
              <br/>
              <button (click)="enviarCSAT()" [disabled]="calificacion() === 0" class="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shadow-amber-500/20">
                Enviar Calificación
              </button>
            </div>
            <div *ngIf="!isOperador()" class="text-center py-4">
              <p class="text-sm text-slate-500">El usuario aún no ha calificado este ticket.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Right Sidebar: Propiedades (1/3) -->
    <div class="space-y-5">

      <!-- Estado y Prioridad -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Propiedades</h3>

        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Estado</label>
          <select *ngIf="isAdminOrEspecialista()" class="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 cursor-pointer"
            [ngClass]="getEstadoBadge(ticket()!.estado)"
            [value]="ticket()!.estado"
            (change)="cambiarEstado($event)">
            <option *ngFor="let e of estados" [value]="e">{{ e }}</option>
          </select>
          <span *ngIf="!isAdminOrEspecialista()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            [ngClass]="getEstadoBadge(ticket()!.estado)">
            {{ ticket()!.estado }}
          </span>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Prioridad</label>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            [ngClass]="getPrioridadBadge(ticket()!.criticidad)">
            {{ ticket()!.criticidad }}
          </span>
        </div>

        <div *ngIf="ticket()!.estado !== 'Resuelto' && ticket()!.estado !== 'Cancelado'">
          <label class="text-xs font-semibold text-slate-500 mb-1 block">SLA</label>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full"
              [ngClass]="{
                'bg-emerald-500': getSemaforoSla(ticket()!) === 'verde',
                'bg-amber-400 animate-pulse': getSemaforoSla(ticket()!) === 'amarillo',
                'bg-red-500 animate-pulse': getSemaforoSla(ticket()!) === 'rojo'
              }"></span>
            <span class="text-sm font-bold" [ngClass]="getSlaIconClass(ticket()!)">
              {{ getSlaTextoSemaforo(ticket()!) }}
            </span>
            <span class="text-xs text-slate-400">transcurrido</span>
          </div>
        </div>
      </div>

      <!-- Personas -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Personas</h3>

        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Área Técnica</label>
          <p class="text-sm font-medium text-slate-800">{{ ticket()!.nombre_area || 'Sin asignar' }}</p>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Creado por</label>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-[10px] font-bold flex items-center justify-center">
              {{ getAvatar(ticket()!.nombre_operador || '?') }}
            </div>
            <span class="text-sm text-slate-800">{{ ticket()!.nombre_operador || 'Desconocido' }}</span>
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Técnico Asignado</label>
          <div *ngIf="ticket()!.nombre_especialista" class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
              {{ getAvatar(ticket()!.nombre_especialista!) }}
            </div>
            <span class="text-sm text-slate-800">{{ ticket()!.nombre_especialista }}</span>
          </div>
          <span *ngIf="!ticket()!.nombre_especialista" class="text-sm text-slate-400">Sin asignar</span>
        </div>

        <div *ngIf="ticket()!.nombre_departamento_origen">
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Departamento Origen</label>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
            🏢 {{ ticket()!.nombre_departamento_origen }}
          </span>
        </div>
      </div>

      <!-- Fechas -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Fechas</h3>

        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-500">Creado</span>
          <span class="text-xs font-semibold text-slate-700">{{ formatFecha(ticket()!.fecha_creacion) }}</span>
        </div>
        <div *ngIf="ticket()!.fecha_actualizacion" class="flex justify-between items-center">
          <span class="text-xs text-slate-500">Actualizado</span>
          <span class="text-xs font-semibold text-slate-700">{{ formatFecha(ticket()!.fecha_actualizacion!) }}</span>
        </div>
        <div *ngIf="ticket()!.fecha_resolucion" class="flex justify-between items-center">
          <span class="text-xs text-slate-500">Resuelto</span>
          <span class="text-xs font-semibold text-emerald-600">{{ formatFecha(ticket()!.fecha_resolucion!) }}</span>
        </div>
        <div *ngIf="ticket()!.tiempo_resolucion_horas" class="flex justify-between items-center">
          <span class="text-xs text-slate-500">Tiempo resolución</span>
          <span class="text-xs font-bold text-emerald-600">{{ ticket()!.tiempo_resolucion_horas }}h</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-500">Versión</span>
          <span class="text-xs font-mono text-slate-400">v{{ ticket()!.version }}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Loading Skeleton -->
<ng-template #loadingSkeleton>
  <div class="space-y-5 animate-pulse">
    <div class="h-5 w-48 bg-slate-200 rounded-lg"></div>
    <div class="h-8 w-80 bg-slate-200 rounded-lg"></div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div class="xl:col-span-2 space-y-5">
        <div class="bg-white rounded-2xl border border-slate-100 p-6"><div class="h-32 bg-slate-200 rounded-xl"></div></div>
        <div class="bg-white rounded-2xl border border-slate-100 p-6"><div class="h-48 bg-slate-200 rounded-xl"></div></div>
      </div>
      <div class="space-y-5">
        <div class="bg-white rounded-2xl border border-slate-100 p-5"><div class="h-40 bg-slate-200 rounded-xl"></div></div>
        <div class="bg-white rounded-2xl border border-slate-100 p-5"><div class="h-32 bg-slate-200 rounded-xl"></div></div>
      </div>
    </div>
  </div>
</ng-template>`,
})
export class TicketDetailComponent implements OnInit {
  route        = inject(ActivatedRoute);
  router       = inject(Router);
  location     = inject(Location);
  ticketsSvc   = inject(TicketsService);
  dashSvc      = inject(DashboardService);
  macrosSvc    = inject(MacrosService);
  auth         = inject(AuthService);
  toast        = inject(ToastService);
  fb           = inject(FormBuilder);

  apiUrl       = 'http://localhost:8000'; // For attachments

  ticket       = signal<Ticket | null>(null);
  historial    = signal<HistorialTicket[]>([]);
  comentarios  = signal<ComentarioTicket[]>([]);
  tecnicos     = signal<Usuario[]>([]);
  macros       = signal<Macro[]>([]);
  adjuntos     = signal<Adjunto[]>([]);
  csat         = signal<CSAT | null>(null);
  enviandoComentario = signal(false);

  calificacion = signal(0);
  csatCommentControl = this.fb.control('');

  fileAdjunto: File | null = null;

  estados = Object.values(EstadoTicket);

  commentForm = this.fb.group({
    contenido:       ['', [Validators.required, Validators.minLength(3)]],
    es_nota_interna: [false],
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.goBack(); return; }
    this.loadTicket(id);
  }

  loadTicket(id: number) {
    forkJoin({
      ticket: this.ticketsSvc.getById(id),
      historial: this.ticketsSvc.getHistorial(id),
      comentarios: this.ticketsSvc.getComentarios(id),
      adjuntos: this.ticketsSvc.getAdjuntos(id),
    }).subscribe({
      next: (data) => {
        this.ticket.set(data.ticket);
        this.historial.set(data.historial);
        this.comentarios.set(data.comentarios);
        this.adjuntos.set(data.adjuntos);
        
        // Load macros if user is Admin or Especialista
        if (this.isAdminOrEspecialista()) {
          this.macrosSvc.listar(data.ticket.id_area).subscribe(m => this.macros.set(m));
        }

        // Load CSAT if resolved
        if (data.ticket.estado === 'Resuelto') {
          this.ticketsSvc.getCSAT(id).subscribe({
            next: (csatData) => this.csat.set(csatData),
            error: () => this.csat.set(null) // No tiene csat
          });
        }
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el ticket');
        this.goBack();
      },
    });
  }

  goBack() {
    this.location.back();
  }

  rolePath(): string {
    const r = this.auth.currentUser()?.rol;
    if (r === RolUsuario.ADMINISTRADOR) return 'admin';
    if (r === RolUsuario.ESPECIALISTA) return 'especialista';
    if (r === RolUsuario.OPERADOR) return 'operador';
    return 'login';
  }

  isAdminOrEspecialista(): boolean {
    const r = this.auth.currentUser()?.rol;
    return r === RolUsuario.ADMINISTRADOR || r === RolUsuario.ESPECIALISTA;
  }

  isOperador(): boolean {
    return this.auth.currentUser()?.rol === RolUsuario.OPERADOR;
  }

  cambiarEstado(event: Event) {
    if (!this.isAdminOrEspecialista()) return;
    const t = this.ticket()!;
    const nuevo = (event.target as HTMLSelectElement).value;
    this.ticketsSvc.actualizarTicket(t.id, { estado: nuevo, version: t.version }).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.toast.success('Estado actualizado', `#${t.id} → ${nuevo}`);
        // Reload historial
        this.ticketsSvc.getHistorial(t.id).subscribe(h => this.historial.set(h));
      },
      error: (err) => this.toast.error('Error', err.error?.detail || 'No se pudo actualizar'),
    });
  }

  insertarMacro(m: Macro) {
    const current = this.commentForm.value.contenido || '';
    const newContent = current ? current + '\n\n' + m.contenido : m.contenido;
    this.commentForm.patchValue({ contenido: newContent });
    this.toast.success('Macro insertada', m.titulo);
  }

  enviarComentario() {
    if (this.commentForm.invalid) return;
    this.enviandoComentario.set(true);
    const t = this.ticket()!;
    const userId = this.auth.currentUser()?.id;

    this.ticketsSvc.crearComentario(t.id, {
      contenido: this.commentForm.value.contenido!,
      es_nota_interna: this.commentForm.value.es_nota_interna || false,
      id_usuario: userId,
    }).subscribe({
      next: (c) => {
        this.comentarios.update(cs => [...cs, c]);
        
        // Si hay archivo, subirlo asociado al comentario
        if (this.fileAdjunto) {
          this.ticketsSvc.subirAdjunto(t.id, this.fileAdjunto, c.id, userId).subscribe({
            next: (adj) => {
              this.adjuntos.update(ads => [...ads, adj]);
              this.finalizarComentario();
            },
            error: () => {
              this.toast.error('Atención', 'Comentario guardado, pero falló la subida del archivo');
              this.finalizarComentario();
            }
          });
        } else {
          this.finalizarComentario();
        }
      },
      error: () => {
        this.enviandoComentario.set(false);
        this.toast.error('Error', 'No se pudo agregar el comentario');
      },
    });
  }

  private finalizarComentario() {
    this.commentForm.reset({ es_nota_interna: false });
    this.fileAdjunto = null;
    this.enviandoComentario.set(false);
    this.toast.success('Comentario agregado', '');
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileAdjunto = file;
    }
  }

  enviarCSAT() {
    if (this.calificacion() === 0) return;
    const t = this.ticket()!;
    const data = {
      calificacion: this.calificacion(),
      comentario: this.csatCommentControl.value || '',
      id_usuario: this.auth.currentUser()?.id
    };
    
    this.ticketsSvc.enviarCSAT(t.id, data).subscribe({
      next: (res) => {
        this.csat.set(res);
        this.toast.success('¡Gracias!', 'Tu calificación ha sido enviada');
      },
      error: (err) => this.toast.error('Error', err.error?.detail || 'No se pudo enviar')
    });
  }

  formatFecha(isoString: string): string {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  // Delegamos a utilidades compartidas
  getEstadoBadge = getEstadoBadge;
  getPrioridadBadge = getPrioridadBadge;
  getSemaforoSla = getSemaforoSla;
  getSlaTextoSemaforo = getSlaTextoSemaforo;
  getSlaIconClass = getSlaIconClass;
  getAvatar = getAvatarInitials;
}
