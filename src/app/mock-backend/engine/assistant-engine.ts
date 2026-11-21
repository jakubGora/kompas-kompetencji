import type { AssessmentCaseData, AssessmentPath, Expectation } from '@core/domain/assessment.model';
import type {
  AssistantAnswer,
  AssistantQuestion,
  Citation,
  ConversationPlan,
  ConversationPlanItem,
  DraftText,
  SuggestedQuestion,
} from '@core/domain/assistant.model';
import type { CompetencyModel } from '@core/domain/competency.model';
import { criterionName, type CriterionId } from '@core/domain/criteria';
import { formatDatePl, type IsoDateTime } from '@core/domain/date';
import { formatScore } from '@core/domain/result';
import { pointsLabel } from '@core/domain/scales';
import { caseCriteria, caseResult, ratingFor, reviewTopicsFor } from '@core/domain/workflow';
import { CONVERSATION_INTENTS, INTENTS, type AssistantIntent } from '../data/assistant-intents';
import { FRAGMENTS, SOURCES } from '../data/knowledge';
import { normalize, newId, truncate } from './text';

export const ASSISTANT_MODEL = 'kompas-mock-ai 0.3 (wyszukiwanie w źródłach, offline)';

/** Prośby o wystawienie oceny za oceniającego (tekst po normalizacji, bez polskich znaków). */
const DECISION_PATTERNS = [
  /\bjaka ocene (mam|powinien|powinna|dac|wystawic|przyznac)/,
  /\bile punktow (mam|powinien|powinna|dac|przyznac)/,
  /\b(ocen|wystaw) (ja|go|ich|jej|mu)\b/,
  /\bczy (ona|on) zasluguje/,
];
/** Pytania o cechy osobowości, emocje lub zdrowie — poza zakresem oceny. */
const PERSONALITY_PATTERNS = [
  /\banaliz\w* (emocj|osobowos)/,
  /\bosobowos/,
  /\b(jaki|jaka) (ma|jest) (charakter|osobowosc)/,
  /\bczy (jest|byl|byla) leniw/,
  /\bstan zdrowia/,
  /\bzdrowi\w* psychiczn/,
];

function citation(fragmentId: string): Citation | null {
  const fragment = FRAGMENTS.find((candidate) => candidate.id === fragmentId);
  const source = fragment && SOURCES.find((candidate) => candidate.id === fragment.sourceId);
  if (!fragment || !source) {
    return null;
  }
  return {
    fragmentId,
    sourceId: source.id,
    label: `${fragment.locator} • ${source.shortTitle}`,
    kind: source.kind,
    quote: truncate(fragment.text, 260),
  };
}

function scoreIntent(intent: AssistantIntent, question: string, path: AssessmentPath | undefined): number {
  const text = normalize(question);
  let score = 0;
  for (const keyword of intent.keywords) {
    if (text.includes(normalize(keyword))) score += 1;
  }
  for (const phrase of intent.phrases ?? []) {
    if (text.includes(normalize(phrase))) score += 2.5;
  }
  if (path && intent.paths.length > 0) {
    const mentionsFirst = /pierwsz/.test(text);
    const mentionsPeriodic = /okresow/.test(text);
    const effectivePath: AssessmentPath = mentionsFirst ? 'first' : mentionsPeriodic ? 'periodic' : path;
    score += intent.paths.includes(effectivePath) ? 0.75 : -2;
  }
  return score;
}

function baseAnswer(q: AssistantQuestion, answeredAt: IsoDateTime): Pick<AssistantAnswer, 'id' | 'question' | 'mode' | 'answeredAt' | 'model'> {
  return { id: newId('ans'), question: q.question, mode: q.mode, answeredAt, model: ASSISTANT_MODEL };
}

export function answerQuestion(q: AssistantQuestion, answeredAt: IsoDateTime): AssistantAnswer {
  const text = normalize(q.question);

  if (DECISION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ...baseAnswer(q, answeredAt),
      status: 'poza-zakresem',
      answer:
        'Nie wystawiam ocen — decyzję podejmuje oceniający. Mogę pokazać, jak powstaje sugestia narzędzia i które obserwacje ją uzasadniają.',
      bullets: [],
      citations: [citation('regula-sugestia'), citation('r16-p2')].filter((c): c is Citation => c !== null),
      toolRule: true,
      followUps: ['Jak liczona jest sugestia?', 'Co oznacza „brak podstaw do oceny”?'],
    };
  }
  if (PERSONALITY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ...baseAnswer(q, answeredAt),
      status: 'poza-zakresem',
      answer:
        'Nie analizuję emocji, zdrowia ani cech osobowości. Ocena dotyczy zachowań w pracy opisanych w modelu kompetencji — opisz konkretną sytuację, działanie i rezultat.',
      bullets: [],
      citations: [citation('model-przyklady')].filter((c): c is Citation => c !== null),
      toolRule: false,
      followUps: ['Jak opisać obserwację?'],
    };
  }

  const pool = q.mode === 'rozmowa' ? [...CONVERSATION_INTENTS, ...INTENTS] : INTENTS;
  const ranked = pool
    .map((intent) => ({ intent, score: scoreIntent(intent, q.question, q.context?.path) + (intent.mode === q.mode ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score < 2) {
    return {
      ...baseAnswer(q, answeredAt),
      status: 'brak-zrodla',
      answer:
        'W udostępnionych źródłach nie znalazłem odpowiedzi na to pytanie. Nie zgaduję — sprawdź w komórce kadr albo zadaj pytanie inaczej.',
      bullets: ['Przeszukano: rozporządzenia z 2015 i 2016 r., poradniki KPRM, wzory arkuszy i model kompetencji.'],
      citations: [],
      toolRule: false,
      followUps: suggestedQuestions(q.context?.path, q.mode)
        .slice(0, 3)
        .map((s) => s.text),
    };
  }

  const intent = best.intent;
  return {
    ...baseAnswer(q, answeredAt),
    status: 'odpowiedz',
    answer: intent.answer,
    bullets: intent.bullets ?? [],
    citations: intent.fragmentIds.map(citation).filter((c): c is Citation => c !== null),
    toolRule: intent.toolRule ?? false,
    followUps: intent.followUps ?? [],
  };
}

export function suggestedQuestions(path: AssessmentPath | undefined, mode: 'formalny' | 'rozmowa'): SuggestedQuestion[] {
  if (mode === 'rozmowa') {
    return [
      { text: 'Jak zacząć rozmowę oceniającą?', mode },
      { text: 'Jak omówić niepełny komunikat w czasie incydentu?', mode },
      { text: 'Jak zapytać o plan rozwoju?', mode },
      { text: 'Co zrobić, gdy pracownik się nie zgadza?', mode },
    ];
  }
  if (path === 'first') {
    return [
      { text: 'Jakie są warunki pozytywnej pierwszej oceny?', mode },
      { text: 'Jaka jest skala w pierwszej ocenie?', mode },
      { text: 'Kogo nie dotyczy egzamin ze służby przygotowawczej?', mode },
      { text: 'Co po pierwszej ocenie?', mode },
    ];
  }
  return [
    { text: 'Ile kryteriów dodatkowych mogę wybrać?', mode },
    { text: 'Kiedy ocena jest negatywna?', mode },
    { text: 'Dlaczego 6,00 to „na poziomie oczekiwań”?', mode },
    { text: 'Jak nieobecność wpływa na termin oceny?', mode },
    { text: 'Jak liczona jest sugestia?', mode },
  ];
}

// — Plan rozmowy oceniającej —

export function buildConversationPlan(c: AssessmentCaseData, model: CompetencyModel, generatedAt: IsoDateTime): ConversationPlan {
  const criteria = caseCriteria(c);
  const items: ConversationPlanItem[] = criteria.map((criterionId) => {
    const observations = c.observations
      .filter((o) => o.criterionIds.includes(criterionId))
      .sort((a, b) => a.date.localeCompare(b.date));
    const competency = model.competencies.find((candidate) => candidate.id === criterionId);
    const coveredIndicators = new Set(observations.flatMap((o) => o.indicatorIds));
    const gaps = (competency?.indicators ?? [])
      .filter((indicator) => !coveredIndicators.has(indicator.id))
      .slice(0, 2)
      .map((indicator) => `Brak obserwacji: „${truncate(indicator.text, 90)}” — zapytaj o przykład z okresu oceny.`);
    const questions = [
      ...observations.slice(-2).map((o) => `Jak oceniasz sytuację „${o.title}” (${formatDatePl(o.date)})? Co zadziałało, a co warto zrobić inaczej?`),
      ...(gaps.length > 0 ? [`Czy możesz podać przykład z ostatnich miesięcy dotyczący kryterium „${criterionName(criterionId).toLowerCase()}”?`] : []),
    ];
    return {
      criterionId,
      facts: observations.map((o) => ({ observationId: o.id, date: o.date, text: `${o.title}: ${truncate(o.description, 140)}` })),
      gaps,
      questions,
    };
  });

  const weakest = items.filter((item) => item.facts.length === 0 || item.gaps.length > 1).map((item) => criterionName(item.criterionId).toLowerCase());
  const from = c.preliminary.employeeAcknowledgedAt;

  return {
    generatedAt,
    opening: `Cel rozmowy: podsumować okres ${from ? `od ${formatDatePl(from)}` : 'oceny'} na podstawie konkretnych przykładów i wspólnie zaplanować rozwój. Zacznij od pytania o własną ocenę pracownika — rozmowa ma być dialogiem.`,
    agenda: reviewTopicsFor(c.path).map((topic) => ({ topic: topic.label, legalRef: topic.legalRef })),
    items,
    developmentQuestions: [
      'Które zadania z opisu stanowiska chcesz realizować samodzielnie w kolejnym okresie?',
      weakest.length > 0
        ? `Jakiego wsparcia potrzebujesz w obszarach: ${weakest.slice(0, 2).join(', ')}?`
        : 'W jakim obszarze chcesz się rozwijać w kolejnym okresie?',
      'Jaka forma rozwoju będzie najbardziej skuteczna: szkolenie, mentoring, udział w ćwiczeniach?',
    ],
    closing: 'Podsumuj ustalenia, poinformuj o kolejnych krokach: sporządzenie oceny na piśmie, zapoznanie z oceną i wnioski do IPRZ.',
    cautions: [
      'Mów o zachowaniach i ich skutkach, nie o cechach osoby.',
      'Brak obserwacji nie jest dowodem słabości — zapytaj o przykład.',
      'Sugestie narzędzia nie są oceną. Ocenę cząstkową wybierasz po rozmowie.',
    ],
  };
}

// — Szkice tekstów —

export function draftJustification(c: AssessmentCaseData, generatedAt: IsoDateTime): DraftText {
  const result = caseResult(c);
  const criteria = caseCriteria(c);
  const scored = criteria
    .map((criterionId) => ({ criterionId, points: ratingFor(c, criterionId)?.decision?.points ?? null }))
    .filter((entry): entry is { criterionId: CriterionId; points: NonNullable<typeof entry.points> } => entry.points !== null);
  const strengths = scored.filter((entry) => entry.points >= 7);
  const development = scored.filter((entry) => entry.points <= (c.path === 'first' ? 3 : 5));
  const example = (criterionId: CriterionId) => {
    const observation = c.observations.filter((o) => o.criterionIds.includes(criterionId)).at(-1);
    return observation ? ` (np. ${observation.title.toLowerCase()}, ${formatDatePl(observation.date)})` : '';
  };

  const lines: string[] = [];
  const period = c.preliminary.employeeAcknowledgedAt ? `W okresie od ${formatDatePl(c.preliminary.employeeAcknowledgedAt)}` : 'W okresie podlegającym ocenie';
  lines.push(`${period} osoba oceniana (${c.employee.fullName}) realizowała główne obowiązki wynikające z opisu stanowiska ${c.position.code}.`);
  if (strengths.length > 0) {
    lines.push(
      `Najwyżej oceniono: ${strengths.map((s) => `${criterionName(s.criterionId).toLowerCase()} — ${pointsLabel(s.points).toLowerCase()}${example(s.criterionId)}`).join('; ')}.`,
    );
  }
  if (development.length > 0) {
    lines.push(
      `Obszary do dalszej pracy: ${development.map((d) => `${criterionName(d.criterionId).toLowerCase()}${example(d.criterionId)}`).join('; ')}.`,
    );
  }
  if (result.path === 'periodic' && result.periodic.mean !== null && result.periodic.level) {
    lines.push(`Średnia ocen cząstkowych wynosi ${formatScore(result.periodic.mean)}, co odpowiada poziomowi „${result.periodic.level.label.toLowerCase()}”.`);
    if (result.periodic.vetoCriteria.length > 0) {
      lines.push(
        `Ocena cząstkowa 1 pkt w kryterium „${criterionName(result.periodic.vetoCriteria[0]).toLowerCase()}” przesądza o ocenie negatywnej (§ 11 ust. 1 pkt 4). [Uzupełnij fakty, które uzasadniają tę ocenę.]`,
      );
    }
  }
  return {
    text: lines.join(' '),
    basedOn: ['Decyzje w ocenach cząstkowych', `${c.observations.length} obserwacji`, 'Wnioski z rozmowy oceniającej'],
    generatedAt,
  };
}

export function draftDevelopmentPlan(c: AssessmentCaseData, generatedAt: IsoDateTime): DraftText {
  const criteria = caseCriteria(c);
  const threshold = c.path === 'first' ? 3 : 5;
  const areas = criteria.filter((criterionId) => {
    const points = ratingFor(c, criterionId)?.decision?.points;
    return points !== undefined && points <= threshold;
  });
  const lines: string[] = [];
  if (areas.length > 0) {
    lines.push(`Obszary do doskonalenia: ${areas.map((id) => criterionName(id).toLowerCase()).join(', ')}.`);
  }
  if (c.review.developmentNeeds.trim()) {
    lines.push(`Potrzeby zgłoszone w rozmowie oceniającej: ${c.review.developmentNeeds.trim()}`);
  }
  lines.push('Proponowane formy: szkolenie specjalistyczne, udział w ćwiczeniach z rolą koordynatora, mentoring doświadczonego pracownika wydziału.');
  lines.push('Termin przeglądu postępów: za 6 miesięcy w rozmowie z przełożonym.');
  return {
    text: lines.join('\n'),
    basedOn: ['Oceny cząstkowe', 'Rozmowa oceniająca', 'Poradnik KPRM, rozdz. 6.2.5.4'],
    generatedAt,
  };
}

export function draftExpectations(c: AssessmentCaseData, model: CompetencyModel): Expectation[] {
  return caseCriteria(c).map((criterionId) => {
    const competency = model.competencies.find((candidate) => candidate.id === criterionId);
    const standard = competency?.indicators
      .slice(0, 2)
      .map((indicator) => indicator.behaviors.find((behavior) => behavior.level_index === 3)?.description)
      .filter((text): text is string => Boolean(text));
    return {
      criterionId,
      text:
        standard && standard.length > 0
          ? `Oczekuję, że: ${standard.map((s, index) => (index === 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s)).join(' ')}`
          : '',
    };
  });
}
