import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { KbService, KbArticle } from '../../services/kb.service';
import { SkeletonComponent } from '../ui/skeleton/skeleton';

@Component({
  selector: 'app-kb-article',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonComponent],
  templateUrl: './kb-article.component.html'
})
export class KbArticleComponent implements OnInit {
  article: KbArticle | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private kbService: KbService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadArticle(id);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  loadArticle(id: string): void {
    this.kbService.getArticle(id).subscribe({
      next: (res) => {
        this.article = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando articulo', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
