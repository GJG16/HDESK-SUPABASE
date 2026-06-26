import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KbService, KbArticle } from '../../services/kb.service';
import { AuthService } from '../../services/auth.service';
import { SkeletonComponent } from '../ui/skeleton/skeleton';
import { ButtonComponent } from '../ui/button/button';

@Component({
  selector: 'app-kb-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SkeletonComponent, ButtonComponent],
  templateUrl: './kb-list.component.html'
})
export class KbListComponent implements OnInit {
  articles: KbArticle[] = [];
  filteredArticles: KbArticle[] = [];
  loading = true;
  searchTerm = '';

  constructor(private kbService: KbService, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  loadArticles(): void {
    this.loading = true;
    this.kbService.getArticles().subscribe({
      next: (res) => {
        this.articles = res;
        this.filteredArticles = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar KB:', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredArticles = this.articles;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredArticles = this.articles.filter(a => 
      a.titulo.toLowerCase().includes(term) || 
      a.contenido.toLowerCase().includes(term) ||
      (a.etiquetas && a.etiquetas.some(e => e.toLowerCase().includes(term)))
    );
  }

  deleteArticle(id: string): void {
    if(confirm('¿Seguro que deseas eliminar este artículo?')) {
      this.kbService.deleteArticle(id).subscribe({
        next: () => this.loadArticles(),
        error: () => alert('Error al eliminar')
      });
    }
  }
}
