import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import type { ComponentType } from '@angular/cdk/portal';
import { Injectable, Injector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, type ConfirmOptions } from './confirm-dialog.component';

export interface OpenOptions<D> {
  readonly data?: D;
  readonly width?: string;
  /** Id nagłówka dialogu (`aria-labelledby`). */
  readonly labelledBy?: string;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  open<R, D = unknown, C = unknown>(component: ComponentType<C>, options: OpenOptions<D> = {}): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      ...(options.data !== undefined ? { data: options.data } : {}),
      width: options.width ?? '560px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'kp-dialog-panel',
      backdropClass: 'kp-backdrop',
      ariaLabelledBy: options.labelledBy ?? null,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  /** Panel wysuwany z prawej krawędzi (szczegóły, źródła, powiadomienia). */
  drawer<R, D = unknown, C = unknown>(component: ComponentType<C>, options: OpenOptions<D> = {}): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      ...(options.data !== undefined ? { data: options.data } : {}),
      width: options.width ?? '480px',
      maxWidth: '100vw',
      height: '100dvh',
      positionStrategy: createGlobalPositionStrategy(this.injector).right('0').top('0'),
      panelClass: 'kp-drawer-panel',
      backdropClass: 'kp-backdrop',
      ariaLabelledBy: options.labelledBy ?? null,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.open<boolean, ConfirmOptions, ConfirmDialogComponent>(ConfirmDialogComponent, {
      data: options,
      width: '440px',
      labelledBy: 'kp-confirm-title',
    });
    return (await firstValueFrom(ref.closed)) === true;
  }
}
