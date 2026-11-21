import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type DictationSupport = 'checking' | 'available' | 'unavailable';

interface RecognitionAlternative {
  readonly transcript: string;
}

interface RecognitionResultEvent {
  readonly results: ArrayLike<ArrayLike<RecognitionAlternative>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

interface RecognitionConstructor {
  new (): Recognition;
  available?(options: { readonly langs: readonly string[]; readonly processLocally: boolean }): Promise<string>;
}

const LANG = 'pl-PL';

function recognitionConstructor(view: Window | null): RecognitionConstructor | null {
  const candidate = view as (Window & Record<string, unknown>) | null;
  const ctor = candidate?.['SpeechRecognition'] ?? candidate?.['webkitSpeechRecognition'];
  return typeof ctor === 'function' ? (ctor as RecognitionConstructor) : null;
}

/**
 * Dyktowanie pytań do asystenta wyłącznie z rozpoznawaniem mowy na urządzeniu.
 * Gdy przeglądarka wysłałaby nagranie do chmury, funkcja pozostaje wyłączona.
 */
@Injectable({ providedIn: 'root' })
export class LocalDictation {
  private readonly ctor = recognitionConstructor(inject(DOCUMENT).defaultView);
  private active: Recognition | null = null;

  readonly support = signal<DictationSupport>('checking');
  readonly listening = signal(false);

  constructor() {
    void this.detect();
  }

  start(onText: (text: string) => void): void {
    if (this.support() !== 'available' || !this.ctor || this.active) return;
    const recognition = new this.ctor();
    recognition.lang = LANG;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.processLocally = true;
    recognition.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) onText(text);
    };
    recognition.onend = () => this.finish();
    recognition.onerror = () => this.finish();
    this.active = recognition;
    this.listening.set(true);
    recognition.start();
  }

  stop(): void {
    this.active?.stop();
  }

  private finish(): void {
    this.active = null;
    this.listening.set(false);
  }

  private async detect(): Promise<void> {
    if (!this.ctor?.available) {
      this.support.set('unavailable');
      return;
    }
    try {
      const status = await this.ctor.available({ langs: [LANG], processLocally: true });
      this.support.set(status === 'available' ? 'available' : 'unavailable');
    } catch {
      this.support.set('unavailable');
    }
  }
}
