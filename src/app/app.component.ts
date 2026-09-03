import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Link, LinksService } from './links.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly linksService = inject(LinksService);

  readonly url = signal('');
  readonly links = signal<Link[]>([]);
  readonly shortUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  constructor() {
    this.refresh();
  }

  onUrlInput(value: string): void {
    this.url.set(value);
  }

  submit(): void {
    this.error.set(null);
    this.shortUrl.set(null);

    const value = this.url().trim();
    if (!this.isValidHttpUrl(value)) {
      this.error.set('Enter a valid http:// or https:// URL.');
      return;
    }

    this.submitting.set(true);
    this.linksService.create(value).subscribe({
      next: (link) => {
        this.shortUrl.set(link.shortUrl);
        this.url.set('');
        this.submitting.set(false);
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Could not reach the backend. Is it running on http://localhost:3000?');
        this.submitting.set(false);
      },
    });
  }

  private refresh(): void {
    this.linksService.list().subscribe({
      next: (links) => this.links.set(links),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Could not reach the backend. Is it running on http://localhost:3000?');
      },
    });
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
