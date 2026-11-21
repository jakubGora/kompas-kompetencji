import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import type { AssistantContext } from '@core/domain/assistant.model';
import type { StepId } from '@core/domain/assessment.model';
import { stepDefinition } from '@core/domain/workflow';
import { pageTitle } from '@core/layout/page-title.strategy';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageSkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StepperComponent } from '@shared/ui/stepper/stepper.component';
import { filter, map } from 'rxjs';
import { AssistantDrawerComponent } from '../../assistant/assistant-drawer.component';
import { AssistantPanelComponent } from '../../assistant/assistant-panel.component';
import { CaseStore } from '../data/case.store';
import { StepHeaderSlot } from './step-header-aside';

interface ViewInfo {
  readonly step?: StepId;
  readonly view?: string;
  readonly intro?: string;
}

function deepestData(snapshot: ActivatedRouteSnapshot): ViewInfo {
  let current = snapshot;
  while (current.firstChild) current = current.firstChild;
  return current.data as ViewInfo;
}

@Component({
  selector: 'kp-case-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    AssistantPanelComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PageSkeletonComponent,
    StepperComponent,
    KpDatePipe,
  ],
  templateUrl: './case-workspace.component.html',
  styleUrl: './case-workspace.component.scss',
})
export class CaseWorkspaceComponent {
  protected readonly store = inject(CaseStore);
  protected readonly session = inject(SessionStore);
  protected readonly headerSlot = inject(StepHeaderSlot);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);

  readonly caseId = input.required<string>();

  protected readonly view = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => deepestData(this.router.routerState.snapshot.root)),
    ),
    { initialValue: deepestData(this.router.routerState.snapshot.root) },
  );

  private readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 1280px)')
      .pipe(map((state) => state.matches)),
    { initialValue: true },
  );
  protected readonly assistantDocked = this.wide;

  private readonly stepInfo = computed(() => {
    const step = this.view().step;
    return step ? stepDefinition(this.store.path(), step) : undefined;
  });

  protected readonly heading = computed(() => this.view().view ?? this.stepInfo()?.title ?? '');
  protected readonly intro = computed(() => this.view().intro ?? this.stepInfo()?.intro);

  protected readonly caseLabel = computed(() => {
    const c = this.store.case();
    if (!c) return 'Ocena';
    return `${c.path === 'first' ? 'Pierwsza ocena' : 'Oceny okresowe'} – ${c.employee.fullName}`;
  });

  protected readonly assistantContext = computed<AssistantContext>(() => {
    const c = this.store.case();
    const step = this.view().step;
    return c ? { caseId: c.id, path: c.path, ...(step ? { stepId: step } : {}) } : {};
  });

  protected readonly assistantLabel = computed(() => {
    const c = this.store.case();
    if (!c) return undefined;
    const sheet = c.path === 'first' ? 'pierwsza ocena' : c.positionReview.confirmedVariant ? `arkusz ${c.positionReview.confirmedVariant}` : 'ocena okresowa';
    return `Kontekst: ${c.employee.fullName} • ${sheet}`;
  });

  constructor() {
    const breadcrumbs = inject(BreadcrumbStore);
    const title = inject(Title);

    effect(() => this.store.load(this.caseId()));

    effect(() => {
      const c = this.store.case();
      if (!c) {
        breadcrumbs.set([{ label: 'Ocena' }]);
        return;
      }
      const view = this.view().view;
      breadcrumbs.set(view ? [{ label: this.caseLabel(), link: this.store.baseUrl() }, { label: view }] : [{ label: this.caseLabel() }]);
      title.setTitle(pageTitle(`${this.heading() ? `${this.heading()} — ` : ''}${c.employee.fullName}`));
    });
  }

  protected openAssistant(): void {
    this.dialogs.drawer<unknown, { context: AssistantContext; label?: string }>(AssistantDrawerComponent, {
      data: { context: this.assistantContext(), ...(this.assistantLabel() ? { label: this.assistantLabel() } : {}) },
      width: '400px',
    });
  }

  protected retry(): void {
    void this.store.refresh();
  }
}
