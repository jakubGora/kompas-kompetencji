import { effect, untracked, type Signal } from '@angular/core';

/**
 * Wywołuje `save` po każdej faktycznej zmianie modelu formularza (z pominięciem wartości startowej).
 * Debounce i łączenie zmian zapewnia `CaseStore.patch`. Wymaga kontekstu wstrzykiwania.
 */
export function autosave<T>(model: Signal<T>, save: (value: T) => void): void {
  let previous = JSON.stringify(untracked(model));
  effect(() => {
    const value = model();
    const serialized = JSON.stringify(value);
    if (serialized === previous) return;
    previous = serialized;
    untracked(() => save(value));
  });
}

/** Pusty tekst z formularza → brak wartości w danych sprawy. */
export function optional(value: string): string | undefined {
  return value.trim() ? value : undefined;
}
