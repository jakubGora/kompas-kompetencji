import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Wspólny układ dialogów i paneli (projekt: „Dodaj obserwację”): tytuł 19 px z zamknięciem,
 * przewijana treść, akcje na dole bez osobnego tła.
 */
@Component({
  selector: 'kp-dialog-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-dialog-shell' },
  template: `
    <header class="kp-dialog-shell__header">
      <div class="kp-dialog-shell__heading">
        @if (eyebrow()) {
          <p class="kp-dialog-shell__eyebrow">{{ eyebrow() }}</p>
        }
        <h2 class="kp-dialog-shell__title" [id]="titleId()">{{ heading() }}</h2>
        @if (description()) {
          <p class="kp-dialog-shell__description">{{ description() }}</p>
        }
      </div>
      <button type="button" class="kp-dialog-shell__close" (click)="ref.close()" aria-label="Zamknij">
        <kp-icon name="x" [size]="18" />
      </button>
    </header>
    <div class="kp-dialog-shell__body"><ng-content /></div>
    <footer class="kp-dialog-shell__footer"><ng-content select="[dialogFooter]" /></footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      max-height: inherit;
    }
    .kp-dialog-shell__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--kp-space-4);
      padding: var(--kp-space-5) var(--kp-space-5) var(--kp-space-3);
    }
    .kp-dialog-shell__heading {
      display: grid;
      gap: 2px;
    }
    .kp-dialog-shell__eyebrow {
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-3xs);
    }
    .kp-dialog-shell__title {
      margin: 0;
      font-size: var(--kp-font-size-2xl);
      font-weight: 500;
      line-height: 1.4;
    }
    .kp-dialog-shell__description {
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-dialog-shell__close {
      display: grid;
      place-items: center;
      flex: none;
      width: 32px;
      height: 32px;
      margin: -4px -6px 0 0;
      border: 0;
      border-radius: var(--kp-radius-sm);
      background: transparent;
      color: var(--kp-color-text);
      cursor: pointer;
    }
    .kp-dialog-shell__close:hover {
      background: var(--kp-color-surface-tint);
      color: var(--kp-color-primary);
    }
    .kp-dialog-shell__body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: var(--kp-space-2) var(--kp-space-5) var(--kp-space-4);
      scrollbar-width: thin;
      scrollbar-color: var(--kp-color-primary) var(--kp-color-surface-tint);
    }
    .kp-dialog-shell__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--kp-space-3);
      padding: var(--kp-space-2) var(--kp-space-5) var(--kp-space-5);
    }
    .kp-dialog-shell__footer:empty {
      display: none;
    }
  `,
})
export class DialogShellComponent {
  protected readonly ref = inject(DialogRef);

  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly eyebrow = input<string>();
  readonly titleId = input<string>('kp-dialog-title');
}
