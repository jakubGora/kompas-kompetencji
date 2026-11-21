import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { AssistantContext } from '@core/domain/assistant.model';
import { AssistantPanelComponent } from './assistant-panel.component';

export interface AssistantDrawerData {
  readonly context: AssistantContext;
  readonly label?: string;
}

@Component({
  selector: 'kp-assistant-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AssistantPanelComponent],
  template: `
    <kp-assistant-panel
      class="kp-assistant-drawer"
      [context]="data.context"
      [contextLabel]="data.label"
      [closable]="true"
      (closed)="ref.close()"
    />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .kp-assistant-drawer {
      height: 100%;
      --kp-assistant-border: 0;
    }
  `,
})
export class AssistantDrawerComponent {
  protected readonly data = inject<AssistantDrawerData>(DIALOG_DATA);
  protected readonly ref = inject(DialogRef);
}
