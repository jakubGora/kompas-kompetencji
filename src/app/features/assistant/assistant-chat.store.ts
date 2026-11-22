import { Injectable } from '@angular/core';
import type { AssistantAnswer, AssistantMode } from '@core/domain/assistant.model';

/** Jedna wymiana zapisana lokalnie (per sprawa oceny). */
export interface StoredAssistantMessage {
  readonly id: number;
  readonly question: string;
  readonly mode: AssistantMode;
  readonly answer?: AssistantAnswer;
  readonly error?: string;
}

const STORAGE_KEY = 'kompas.assistant.chats';
const MAX_MESSAGES = 20;
const MAX_CASES = 40;

type ChatMap = Record<string, readonly StoredAssistantMessage[]>;

@Injectable({ providedIn: 'root' })
export class AssistantChatStore {
  load(caseId: string): readonly StoredAssistantMessage[] {
    const all = readAll();
    const items = all[caseId] ?? [];
    return items.filter((m) => m.answer || m.error);
  }

  save(caseId: string, messages: readonly StoredAssistantMessage[]): void {
    const trimmed = messages.filter((m) => m.answer || m.error).slice(-MAX_MESSAGES);
    const all = readAll();
    if (trimmed.length === 0) {
      delete all[caseId];
    } else {
      all[caseId] = trimmed;
    }
    writeAll(prune(all));
  }

  clear(caseId: string): void {
    const all = readAll();
    if (!(caseId in all)) return;
    delete all[caseId];
    writeAll(all);
  }
}

function readAll(): ChatMap {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ChatMap;
  } catch {
    return {};
  }
}

function writeAll(all: ChatMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode — UI i tak działa w pamięci */
  }
}

/** Zostaw najnowsze sprawy, gdy mapa urośnie ponad limit. */
function prune(all: ChatMap): ChatMap {
  const keys = Object.keys(all);
  if (keys.length <= MAX_CASES) return all;
  const ranked = keys
    .map((key) => {
      const last = all[key]?.at(-1);
      const stamp = last?.answer?.answeredAt ?? '';
      return { key, stamp };
    })
    .sort((a, b) => a.stamp.localeCompare(b.stamp));
  const drop = new Set(ranked.slice(0, keys.length - MAX_CASES).map((entry) => entry.key));
  const next: ChatMap = {};
  for (const key of keys) {
    if (!drop.has(key)) next[key] = all[key]!;
  }
  return next;
}
