import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './post-detail.html'
})
export class PostDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);

  postId: string | null = null;
  post: any = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.postId = params.get('id');
      this.loading = true;
      this.errorMessage = '';

      if (!this.postId) {
        this.loading = false;
        this.errorMessage = 'Aucune annonce sélectionnée.';
        return;
      }

      const localMatch = this.jobService.getLocalPostById(this.postId);
      if (localMatch) {
        this.post = localMatch;
        this.loading = false;
        return;
      }

      this.jobService.getPostById(this.postId).subscribe((data) => {
        this.loading = false;
        this.post = data || this.jobService.getLocalPostById(this.postId ?? '');

        if (!this.post) {
          this.errorMessage = 'Impossible de charger cette annonce.';
        }
      });
    });
  }

  getImageUrl(image: any): string | null {
    if (!image) return null;

    if (typeof image === 'string') {
      if (image.startsWith('data:') || image.startsWith('blob:') || /^https?:\/\//i.test(image)) {
        return image;
      }
      if (image.startsWith('/')) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        return `${base}${image}`;
      }
      return image;
    }

    if (typeof image === 'object' && image.url) {
      return this.getImageUrl(image.url);
    }

    return null;
  }
}
