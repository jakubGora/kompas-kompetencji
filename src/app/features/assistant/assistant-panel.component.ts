import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { KnowledgeApi } from '@core/api/knowledge.api';
import type {
  AnswerStatus,
  AssistantAnswer,
  AssistantContext,
  AssistantMode,
  AssistantTurn,
  Citation,
} from '@core/domain/assistant.model';
import { toApiError } from '@core/http/api-error';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { firstValueFrom } from 'rxjs';
import { AssistantChatStore, type StoredAssistantMessage } from './assistant-chat.store';
import { SourceDrawerComponent, type SourceDrawerData } from './source-drawer.component';

type Message = StoredAssistantMessage;

const STATUS: Readonly<Record<AnswerStatus, string>> = {
  odpowiedz: 'Odpowiedź ze źródeł',
  'brak-zrodla': 'Brak podstawy w źródłach',
  'poza-zakresem': 'Poza zakresem asystenta',
};

const MAX_LENGTH = 500;
/** Wymiany → role user/assistant; BE bierze do ~10 wiadomości. */
const HISTORY_TURNS = 5;
let instances = 0;

@Component({
  selector: 'kp-assistant-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-assistant', '[class.kp-assistant--embedded]': 'embedded()' },
  templateUrl: './assistant-panel.component.html',
  styleUrl: './assistant-panel.component.scss',
})
export class AssistantPanelComponent {
  private readonly api = inject(KnowledgeApi);
  private readonly chats = inject(AssistantChatStore);
  private readonly dialogs = inject(DialogService);
  private readonly injector = inject(Injector);

  readonly context = input<AssistantContext>({});
  /** Opis kontekstu pod nagłówkiem, np. „Anna Nowak · Ocena kryteriów”. */
  readonly contextLabel = input<string>();
  /** Panel osadzony na stronie (baza wiedzy) zamiast w kolumnie bocznej. */
  readonly embedded = input(false);
  readonly closable = input(false);
  readonly closed = output();

  protected readonly mode = signal<AssistantMode>('formalny');
  protected readonly draft = signal('');
  protected readonly messages = signal<readonly Message[]>([]);
  protected readonly pending = computed(() => this.messages().some((message) => !message.answer && !message.error));
  protected readonly status = STATUS;
  protected readonly maxLength = MAX_LENGTH;
  protected readonly uid = `kp-assistant-${++instances}`;
  private nextId = 0;
  private activeCaseId: string | null = null;

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  private readonly path = computed(() => this.context().path);
  private readonly suggestionsResource = rxResource({
    params: () => ({ mode: this.mode(), path: this.path() }),
    stream: ({ params }) => this.api.suggestions(params.mode, params.path),
  });
  protected readonly suggestions = computed(() =>
    this.suggestionsResource.hasValue() ? this.suggestionsResource.value().slice(0, 4) : [],
  );

  constructor() {
    effect(() => {
      const caseId = this.context().caseId ?? null;
      if (caseId === this.activeCaseId) return;
      this.activeCaseId = caseId;
      if (!caseId) {
        this.messages.set([]);
        this.nextId = 0;
        return;
      }
      const stored = this.chats.load(caseId);
      this.messages.set(stored);
      this.nextId = stored.reduce((max, message) => Math.max(max, message.id), 0);
      if (stored.length > 0) this.scrollToEnd();
    });
  }

  protected setMode(mode: AssistantMode): void {
    this.mode.set(mode);
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.ask(this.draft());
    }
  }

  async ask(text: string): Promise<void> {
    const question = text.trim().slice(0, MAX_LENGTH);
    if (!question || this.pending()) return;
    const id = ++this.nextId;
    const mode = this.mode();
    const history = this.history();
    this.messages.update((items) => [...items, { id, question, mode }]);
    this.draft.set('');
    this.scrollToEnd();
    try {
      const answer = await firstValueFrom(this.api.ask({ question, mode, context: this.context(), history }));
      this.replace(id, { answer });
    } catch (error) {
      this.replace(id, { error: toApiError(error).message });
    }
    this.persist();
    this.scrollToEnd();
  }

  protected openCitation(citation: Citation): void {
    this.dialogs.drawer<unknown, SourceDrawerData>(SourceDrawerComponent, {
      data: { fragmentId: citation.fragmentId },
      width: '520px',
      labelledBy: 'kp-source-title',
    });
  }

  protected clear(): void {
    this.messages.set([]);
    const caseId = this.activeCaseId;
    if (caseId) this.chats.clear(caseId);
  }

  private history(): AssistantTurn[] {
    return this.messages()
      .filter((message) => message.answer)
      .slice(-HISTORY_TURNS)
      .flatMap((message) => [
        { role: 'user' as const, content: message.question },
        { role: 'assistant' as const, content: message.answer?.answer ?? '' },
      ]);
  }

  private replace(id: number, change: Partial<Message>): void {
    this.messages.update((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  private persist(): void {
    const caseId = this.activeCaseId;
    if (!caseId) return;
    this.chats.save(caseId, this.messages());
  }

  private scrollToEnd(): void {
    afterNextRender(
      () => {
        const element = this.log()?.nativeElement;
        if (element) element.scrollTop = element.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}
