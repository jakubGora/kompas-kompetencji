import { Injectable, signal } from '@angular/core';

export interface Breadcrumb {
  readonly label: string;
  /** Brak linku — bieżąca strona. */
  readonly link?: string;
}

/** Ścieżka okruszków ustawiana przez strony (nazwy zależą od danych, np. imienia ocenianego). */
@Injectable({ providedIn: 'root' })
export class BreadcrumbStore {
  private readonly state = signal<readonly Breadcrumb[]>([]);
  readonly crumbs = this.state.asReadonly();

  set(crumbs: readonly Breadcrumb[]): void {
    this.state.set(crumbs);
  }
}
