import type {
  AssessmentCaseData,
  AssessmentPath,
  CriterionRating,
  FormVariant,
  StepId,
  TopicStatus,
} from './assessment.model';
import { mandatoryCriteriaFor, MAX_ADDITIONAL_CRITERIA, type CriterionId } from './criteria';
import { addMonths, diffInDays, isAfter, isBefore } from './date';
import { computeFirstResult, computePeriodicResult } from './result';

export interface StepDefinition {
  readonly id: StepId;
  /** Nazwa w pasku kroków i na listach. */
  readonly label: string;
  /** Tytuł ekranu kroku. */
  readonly title: string;
  /** Jednozdaniowa instrukcja pod tytułem ekranu. */
  readonly intro: string;
  readonly description: string;
  readonly legalRef: string;
}

export const PERIODIC_STEPS: readonly StepDefinition[] = [
  {
    id: 'stanowisko',
    label: 'Stanowisko i OSP',
    title: 'Stanowisko i OSP',
    intro: 'Sprawdź dane z OSP i wybierz arkusz. Następnie zatwierdź wybór i przejdź do kryteriów.',
    description: 'Sprawdź dane z opisu stanowiska i potwierdź właściwy arkusz oceny.',
    legalRef: '§ 3 rozporządzenia z 2016 r.',
  },
  {
    id: 'kryteria',
    label: 'Kryteria',
    title: 'Wybierz kryteria oceny',
    intro: 'Sprawdź 5 kryteriów obowiązkowych i maksymalnie 3 dodatkowe. Zatwierdź zestaw przed rozmową.',
    description: 'Sprawdź kryteria obowiązkowe i wybierz najwyżej 3 dodatkowe, najistotniejsze dla stanowiska.',
    legalRef: '§ 4–5 rozporządzenia z 2016 r.',
  },
  {
    id: 'rozmowa-wstepna',
    label: 'Rozmowa wstępna',
    title: 'Rozmowa wstępna',
    intro: 'Uzgodnij oczekiwania i termin oceny. Po zapisaniu Części I przejdź do obserwacji.',
    description: 'Omów obowiązki, kryteria i oczekiwania, ustal termin oceny. Oceniany podpisuje część I.',
    legalRef: '§ 5–7 rozporządzenia z 2016 r.',
  },
  {
    id: 'obserwacje',
    label: 'Obserwacje',
    title: 'Obserwacje w okresie oceny',
    intro: 'Dodawaj konkretne przykłady zachowań. Gdy zbierzesz materiał, przygotuj rozmowę oceniającą.',
    description: 'Zapisuj konkretne sytuacje z okresu oceny: datę, sytuację, działanie i rezultat.',
    legalRef: 'Poradnik KPRM, rozdz. 6.2.3',
  },
  {
    id: 'rozmowa-oceniajaca',
    label: 'Rozmowa oceniająca',
    title: 'Rozmowa oceniająca',
    intro: 'Przygotuj rozmowę na podstawie obserwacji. Po rozmowie zapisz wnioski i przejdź do oceny kompetencji.',
    description: 'Przygotuj rozmowę na podstawie faktów, przeprowadź ją i zapisz wnioski.',
    legalRef: '§ 10 rozporządzenia z 2016 r.',
  },
  {
    id: 'ocena',
    label: 'Ocena kompetencji',
    title: 'Ocena kompetencji',
    intro: 'Zaznacz zachowania i porównaj je z sugestią. Decyzję o ocenie cząstkowej podejmujesz Ty.',
    description: 'Zaznacz zachowania, sprawdź sugestię narzędzia i wybierz własną ocenę cząstkową.',
    legalRef: '§ 11 ust. 1 pkt 1 rozporządzenia z 2016 r.',
  },
  {
    id: 'podsumowanie',
    label: 'Część II i dokument',
    title: 'Część II i dokument',
    intro: 'Sprawdź wynik i uzasadnienie, wygeneruj arkusz i odnotuj zapoznanie pracownika z oceną.',
    description: 'Sprawdź wynik, uzasadnienie i wnioski IPRZ, wygeneruj arkusz i odnotuj zapoznanie.',
    legalRef: '§ 11–12 rozporządzenia z 2016 r.',
  },
];

export const FIRST_STEPS: readonly StepDefinition[] = [
  {
    id: 'rozmowa-wstepna',
    label: 'Rozmowa wstępna',
    title: 'Rozmowa wstępna',
    intro: 'Omów zasady pierwszej oceny i oczekiwania w ciągu 21 dni od zatrudnienia. Potem zbieraj obserwacje.',
    description: 'W ciągu 21 dni od zatrudnienia omów zasady oceny, obowiązki i oczekiwania oraz termin sprawozdania.',
    legalRef: '§ 3–4 rozporządzenia z 2015 r.',
  },
  {
    id: 'sluzba-przygotowawcza',
    label: 'Służba przygotowawcza',
    title: 'Służba przygotowawcza',
    intro: 'Odnotuj wynik egzaminu kończącego służbę przygotowawczą albo zwolnienie z tego obowiązku.',
    description: 'Odnotuj wynik egzaminu kończącego służbę przygotowawczą albo zwolnienie z tego obowiązku.',
    legalRef: '§ 2 pkt 2 i § 10 ust. 3 rozporządzenia z 2015 r.',
  },
  {
    id: 'obserwacje',
    label: 'Obserwacje',
    title: 'Obserwacje w okresie oceny',
    intro: 'Dodawaj konkretne przykłady postawy, zaangażowania i postępów. Gdy zbierzesz materiał, przejdź do sprawozdania.',
    description: 'Zapisuj konkretne sytuacje: postawę, zaangażowanie, postępy, relacje i terminowość.',
    legalRef: '§ 2 pkt 1 rozporządzenia z 2015 r.',
  },
  {
    id: 'sprawozdanie',
    label: 'Sprawozdanie',
    title: 'Sprawozdanie pracownika',
    intro: 'Odnotuj złożenie sprawozdania i sprawdź, czy wpłynęło w wyznaczonym terminie.',
    description: 'Odnotuj złożenie sprawozdania i sprawdź, czy wpłynęło w wyznaczonym terminie.',
    legalRef: '§ 4–6 rozporządzenia z 2015 r.',
  },
  {
    id: 'rozmowa-oceniajaca',
    label: 'Rozmowa oceniająca',
    title: 'Rozmowa oceniająca',
    intro: 'Niezwłocznie po sprawozdaniu omów elementy oceny. Zapisz wnioski i kierunki rozwoju.',
    description: 'Niezwłocznie po sprawozdaniu omów elementy oceny i ewentualnie kierunki rozwoju.',
    legalRef: '§ 7–8 rozporządzenia z 2015 r.',
  },
  {
    id: 'ocena',
    label: 'Ocena elementów',
    title: 'Ocena elementów',
    intro: 'Oceń pięć elementów w skali 3/5/7 na podstawie zachowań i obserwacji. Decyzja należy do Ciebie.',
    description: 'Oceń pięć elementów w skali 3/5/7 na podstawie zachowań i obserwacji.',
    legalRef: '§ 9 rozporządzenia z 2015 r.',
  },
  {
    id: 'podsumowanie',
    label: 'Pierwsza ocena',
    title: 'Pierwsza ocena',
    intro: 'Sprawdź warunki pozytywnej oceny i uzasadnienie, a potem odnotuj zapoznanie pracownika z oceną.',
    description: 'Sprawdź warunki pozytywnej oceny, uzasadnienie, potwierdzenia i zapoznanie.',
    legalRef: '§ 10–11 rozporządzenia z 2015 r.',
  },
];

export function stepsFor(path: AssessmentPath): readonly StepDefinition[] {
  return path === 'first' ? FIRST_STEPS : PERIODIC_STEPS;
}

export function stepDefinition(path: AssessmentPath, stepId: StepId): StepDefinition | undefined {
  return stepsFor(path).find((step) => step.id === stepId);
}

export interface TopicDefinition {
  readonly id: string;
  readonly label: string;
  /** Krótka nazwa na liście tematów („Obowiązki z OSP”). */
  readonly shortLabel: string;
  readonly legalRef: string;
  /** Temat może zostać oznaczony jako „nie dotyczy”. */
  readonly optional?: boolean;
}

export const PERIODIC_PRELIMINARY_TOPICS: readonly TopicDefinition[] = [
  { id: 'obowiazki', shortLabel: 'Obowiązki z OSP', label: 'Główne obowiązki wynikające z opisu stanowiska pracy', legalRef: '§ 5 ust. 1 pkt 1' },
  { id: 'kryteria', shortLabel: 'Kryteria oceny', label: 'Kryteria obowiązkowe i dodatkowe', legalRef: '§ 5 ust. 1 pkt 2' },
  { id: 'oczekiwania', shortLabel: 'Oczekiwania', label: 'Oczekiwania co do sposobu spełniania kryteriów', legalRef: '§ 5 ust. 1 pkt 3' },
  {
    id: 'cele', shortLabel: 'Cele, jeśli zasadne',
    label: 'Cele na okres oceny — jeżeli ich określenie jest uzasadnione',
    legalRef: '§ 5 ust. 1 pkt 4',
    optional: true,
  },
];

export const FIRST_PRELIMINARY_TOPICS: readonly TopicDefinition[] = [
  { id: 'sposob-oceny', shortLabel: 'Sposób oceny', label: 'Sposób dokonywania pierwszej oceny', legalRef: '§ 3 pkt 1' },
  { id: 'obowiazki', shortLabel: 'Obowiązki z OSP', label: 'Główne obowiązki z opisu stanowiska i oczekiwania co do ich wykonywania', legalRef: '§ 3 pkt 2' },
  {
    id: 'postawa', shortLabel: 'Oczekiwania',
    label: 'Oczekiwania co do postawy, zaangażowania, postępów, relacji i terminowości',
    legalRef: '§ 3 pkt 3',
  },
  { id: 'sprawozdanie', shortLabel: 'Termin sprawozdania', label: 'Termin złożenia sprawozdania', legalRef: '§ 3 pkt 4' },
];

export const PERIODIC_REVIEW_TOPICS: readonly TopicDefinition[] = [
  {
    id: 'obowiazki', shortLabel: 'Realizacja obowiązków',
    label: 'Główne obowiązki w okresie oceny i sposób ich realizacji, z uwzględnieniem kryteriów',
    legalRef: '§ 10 pkt 1',
  },
  { id: 'cele', shortLabel: 'Realizacja celów', label: 'Sposób realizowania wyznaczonych celów', legalRef: '§ 10 pkt 2', optional: true },
  {
    id: 'rozwoj', shortLabel: 'Kierunki rozwoju',
    label: 'Kierunki dalszego rozwoju zawodowego i potrzeby w zakresie kwalifikacji',
    legalRef: '§ 10 pkt 3',
  },
];

export const FIRST_REVIEW_TOPICS: readonly TopicDefinition[] = [
  {
    id: 'elementy', shortLabel: 'Elementy oceny',
    label: 'Postawa, zaangażowanie, postępy, relacje i terminowość (elementy oceny)',
    legalRef: '§ 7 pkt 1 w zw. z § 2',
  },
  { id: 'egzamin', shortLabel: 'Egzamin', label: 'Wynik egzaminu ze służby przygotowawczej', legalRef: '§ 2 pkt 2' },
  { id: 'sprawozdanie', shortLabel: 'Sprawozdanie', label: 'Sprawozdanie ocenianego', legalRef: '§ 2 pkt 3' },
  {
    id: 'rozwoj', shortLabel: 'Kierunki rozwoju',
    label: 'Kierunki dalszego rozwoju zawodowego i potrzeby ocenianego',
    legalRef: '§ 7 pkt 1',
    optional: true,
  },
];

export function preliminaryTopicsFor(path: AssessmentPath): readonly TopicDefinition[] {
  return path === 'first' ? FIRST_PRELIMINARY_TOPICS : PERIODIC_PRELIMINARY_TOPICS;
}

export function reviewTopicsFor(path: AssessmentPath): readonly TopicDefinition[] {
  return path === 'first' ? FIRST_REVIEW_TOPICS : PERIODIC_REVIEW_TOPICS;
}

export function topicsComplete(
  definitions: readonly TopicDefinition[],
  topics: Readonly<Record<string, TopicStatus>>,
): boolean {
  return definitions.every((topic) => {
    const status = topics[topic.id];
    return status === 'omowiono' || (topic.optional === true && status === 'nie-dotyczy');
  });
}

export function caseVariant(c: Pick<AssessmentCaseData, 'positionReview'>): FormVariant | undefined {
  return c.positionReview.confirmedVariant;
}

/** Kryteria sprawy w kolejności arkusza: obowiązkowe, potem dodatkowe. */
export function caseCriteria(c: Pick<AssessmentCaseData, 'path' | 'positionReview' | 'criteria'>): CriterionId[] {
  const mandatory = mandatoryCriteriaFor(c.path, c.positionReview.confirmedVariant);
  return c.path === 'first' ? [...mandatory] : [...mandatory, ...c.criteria.additional];
}

export function ratingFor(c: Pick<AssessmentCaseData, 'ratings'>, criterionId: string): CriterionRating | undefined {
  return c.ratings.find((rating) => rating.criterionId === criterionId);
}

export function caseResult(c: AssessmentCaseData) {
  const scores = caseCriteria(c).map((criterionId) => ({
    criterionId,
    points: ratingFor(c, criterionId)?.decision?.points ?? null,
  }));
  if (c.path === 'first') {
    return {
      path: 'first' as const,
      first: computeFirstResult({
        scores,
        exam: c.preparatoryService.outcome,
        reportOnTime: reportOnTime(c),
      }),
    };
  }
  return { path: 'periodic' as const, periodic: computePeriodicResult(scores) };
}

export function caseOutcome(c: AssessmentCaseData) {
  const result = caseResult(c);
  return result.path === 'first' ? result.first.outcome : result.periodic.outcome;
}

/** Pierwsza ocena: czy sprawozdanie wpłynęło w wyznaczonym terminie (§ 10 ust. 1 pkt 2). */
export function reportOnTime(c: Pick<AssessmentCaseData, 'report' | 'preliminary'>): boolean | null {
  if (c.report.status === 'niezlozone') {
    return false;
  }
  if (c.report.status !== 'zlozone' || !c.report.submittedAt) {
    return null;
  }
  const deadline = c.preliminary.reportWindow?.to;
  return deadline ? !isAfter(c.report.submittedAt, deadline) : null;
}

export interface StepIssue {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** Dane uzupełniane w dialogu zamykającym krok (podpis części I: data rozmowy i zapoznania). */
  readonly field?: 'podpis';
}

const error = (message: string, field?: StepIssue['field']): StepIssue =>
  field ? { severity: 'error', message, field } : { severity: 'error', message };
const warning = (message: string): StepIssue => ({ severity: 'warning', message });

/**
 * Warunki ukończenia kroku. Błędy blokują przejście dalej; ostrzeżenia tylko informują.
 * Te same reguły stosuje mock API — docelowo backend.
 */
export function validateStep(c: AssessmentCaseData, stepId: StepId): StepIssue[] {
  switch (stepId) {
    case 'stanowisko':
      return validatePosition(c);
    case 'kryteria':
      return validateCriteria(c);
    case 'rozmowa-wstepna':
      return c.path === 'first' ? validateFirstPreliminary(c) : validatePeriodicPreliminary(c);
    case 'sluzba-przygotowawcza':
      return validatePreparatoryService(c);
    case 'obserwacje':
      return validateObservations(c);
    case 'sprawozdanie':
      return validateReport(c);
    case 'rozmowa-oceniajaca':
      return validateReview(c);
    case 'ocena':
      return validateRatings(c);
    case 'podsumowanie':
      return validateConclusion(c);
  }
}

export function blockingIssues(issues: readonly StepIssue[]): StepIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

function validatePosition(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const review = c.positionReview;
  if (!review.confirmedVariant) {
    issues.push(error('Potwierdź arkusz oceny (B albo C).'));
  } else if (
    review.analysis &&
    review.confirmedVariant !== review.analysis.recommendedVariant &&
    !review.overrideReason?.trim()
  ) {
    issues.push(error('Wybrano inny arkusz niż wynika z OSP — wpisz uzasadnienie odstępstwa.'));
  }
  return issues;
}

function validateCriteria(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  if (c.criteria.additional.length > MAX_ADDITIONAL_CRITERIA) {
    issues.push(error(`Wybierz najwyżej ${MAX_ADDITIONAL_CRITERIA} kryteria dodatkowe (§ 5 ust. 2).`));
  }
  if (c.criteria.additional.length === 0) {
    issues.push(warning('Nie wybrano kryteriów dodatkowych — to dopuszczalne, ale sprawdź charakter zadań z OSP.'));
  }
  return issues;
}

function validatePeriodicPreliminary(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const p = c.preliminary;
  if (!p.meetingDate) {
    issues.push(error('Podaj datę rozmowy wstępnej.', 'podpis'));
  }
  if (!topicsComplete(PERIODIC_PRELIMINARY_TOPICS, p.topics)) {
    issues.push(error('Potwierdź omówienie wszystkich tematów z § 5 ust. 1.'));
  }
  const missingExpectations = caseCriteria(c).filter(
    (id) => !p.expectations.find((e) => e.criterionId === id)?.text.trim(),
  );
  if (missingExpectations.length > 0) {
    issues.push(error(`Opisz oczekiwania dla wszystkich kryteriów (brakuje: ${missingExpectations.length}).`));
  }
  if (p.topics['cele'] === 'omowiono' && p.goals.filter((goal) => goal.text.trim()).length === 0) {
    issues.push(error('Zaznaczono omówienie celów — dodaj co najmniej jeden cel.'));
  }
  if (!p.assessmentDueDate) {
    issues.push(error('Podaj termin sporządzenia oceny na piśmie.'));
  } else if (isAfter(p.assessmentDueDate, c.deadlines.dueDate)) {
    issues.push(error('Termin oceny nie może być późniejszy niż termin ustawowy.'));
  }
  if (!p.employeeAcknowledgedAt) {
    issues.push(error('Odnotuj datę zapoznania ocenianego z kryteriami (podpis części I).', 'podpis'));
  }
  if (p.meetingDate && isAfter(p.meetingDate, c.deadlines.preliminaryDueDate)) {
    issues.push(warning('Rozmowa odbyła się po terminie z § 7 — odnotuj przyczynę w notatce.'));
  }
  return issues;
}

function validateFirstPreliminary(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const p = c.preliminary;
  if (!p.meetingDate) {
    issues.push(error('Podaj datę rozmowy wstępnej.', 'podpis'));
  }
  if (!topicsComplete(FIRST_PRELIMINARY_TOPICS, p.topics)) {
    issues.push(error('Potwierdź omówienie wszystkich tematów z § 3.'));
  }
  const from = p.reportWindow?.from;
  const to = p.reportWindow?.to;
  if (!from || !to) {
    issues.push(error('Wyznacz termin złożenia sprawozdania (data początkowa i końcowa).'));
  } else {
    if (isAfter(from, to)) {
      issues.push(error('Data początkowa terminu sprawozdania jest późniejsza niż końcowa.'));
    }
    if (c.deadlines.windowStart && isBefore(from, c.deadlines.windowStart)) {
      issues.push(error('Termin sprawozdania musi przypadać po upływie 8 miesięcy od zatrudnienia (§ 4 ust. 1).'));
    }
    if (isAfter(to, c.deadlines.dueDate)) {
      issues.push(error('Ocena musi nastąpić najpóźniej miesiąc przed końcem umowy — skróć termin sprawozdania.'));
    }
  }
  if (!p.employeeAcknowledgedAt) {
    issues.push(error('Odnotuj podpis ocenianego potwierdzający rozmowę i termin sprawozdania (§ 4 ust. 3).', 'podpis'));
  }
  if (p.meetingDate && isAfter(p.meetingDate, c.deadlines.preliminaryDueDate)) {
    issues.push(warning('Rozmowa wstępna po terminie 21 dni z § 3.'));
  }
  return issues;
}

function validatePreparatoryService(c: AssessmentCaseData): StepIssue[] {
  const s = c.preparatoryService;
  if (!s.outcome) {
    return [error('Wybierz wynik egzaminu albo „nie dotyczy”.')];
  }
  if (s.outcome === 'nie-dotyczy' && !s.exemption) {
    return [error('Wskaż podstawę zwolnienia z egzaminu (§ 10 ust. 3).')];
  }
  if (s.outcome !== 'nie-dotyczy' && !s.examDate) {
    return [error('Podaj datę egzaminu.')];
  }
  return s.outcome === 'niezaliczony'
    ? [warning('Niezaliczony egzamin oznacza negatywną pierwszą ocenę (§ 10 ust. 1 pkt 1).')]
    : [];
}

function validateObservations(c: AssessmentCaseData): StepIssue[] {
  const criteria = caseCriteria(c);
  const covered = new Set(c.observations.flatMap((o) => o.criterionIds));
  const uncovered = criteria.filter((id) => !covered.has(id));
  const issues: StepIssue[] = [];
  if (c.observations.length === 0) {
    issues.push(warning('Brak obserwacji. Ocena oparta na faktach wymaga przykładów z okresu oceny.'));
  } else if (uncovered.length > 0) {
    issues.push(
      warning(
        `${uncovered.length} z ${criteria.length} kryteriów nie ma jeszcze obserwacji — brak obserwacji nie obniża oceny, ale warto o nie zapytać w rozmowie.`,
      ),
    );
  }
  return issues;
}

function validateReport(c: AssessmentCaseData): StepIssue[] {
  const r = c.report;
  const issues: StepIssue[] = [];
  if (!r.status) {
    issues.push(error('Odnotuj, czy sprawozdanie zostało złożone.'));
    return issues;
  }
  if (r.status === 'zlozone') {
    if (!r.submittedAt) {
      issues.push(error('Podaj datę złożenia sprawozdania.'));
    }
    if (r.coverage?.from && r.coverage.to && isBefore(r.coverage.to, addMonths(r.coverage.from, 7))) {
      issues.push(warning('Sprawozdanie powinno obejmować co najmniej 7 miesięcy pracy (§ 6 ust. 1).'));
    }
  }
  if (reportOnTime(c) === false) {
    issues.push(warning('Sprawozdanie niezłożone w terminie — warunek z § 10 ust. 1 pkt 2 nie jest spełniony.'));
  }
  return issues;
}

function validateReview(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const r = c.review;
  if (!r.meetingDate) {
    issues.push(error('Podaj datę rozmowy oceniającej.'));
  }
  if (!topicsComplete(reviewTopicsFor(c.path), r.topics)) {
    issues.push(error('Potwierdź omówienie wymaganych tematów rozmowy.'));
  }
  if (!r.notes.trim()) {
    issues.push(error('Zapisz najważniejsze ustalenia z rozmowy.'));
  }
  if (c.path === 'first' && c.report.submittedAt && r.meetingDate) {
    const gap = diffInDays(r.meetingDate, c.report.submittedAt);
    if (gap > 14) {
      issues.push(warning('Rozmowa powinna odbyć się niezwłocznie po złożeniu sprawozdania (§ 8 ust. 1).'));
    }
  }
  return issues;
}

function validateRatings(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const criteria = caseCriteria(c);
  const missing = criteria.filter((id) => !ratingFor(c, id)?.decision);
  if (missing.length > 0) {
    issues.push(error(`Brakuje ${missing.length} z ${criteria.length} ocen cząstkowych.`));
  }
  const withoutRationale = criteria.filter((id) => {
    const decision = ratingFor(c, id)?.decision;
    return (
      decision &&
      decision.suggestedPoints !== null &&
      decision.points !== decision.suggestedPoints &&
      !decision.rationale.trim()
    );
  });
  if (withoutRationale.length > 0) {
    issues.push(error('Uzasadnij oceny, które różnią się od sugestii narzędzia.'));
  }
  return issues;
}

function validateConclusion(c: AssessmentCaseData): StepIssue[] {
  const issues: StepIssue[] = [];
  const outcome = caseOutcome(c);
  const k = c.conclusion;
  if (outcome === null) {
    issues.push(error('Wynik oceny jest niepełny — uzupełnij poprzednie kroki.'));
  }
  if (outcome === 'negatywna' && !k.justification.trim()) {
    issues.push(error('Ocena negatywna wymaga uzasadnienia.'));
  }
  if (c.path === 'periodic') {
    if (!k.developmentPlan.trim()) {
      issues.push(error('Wpisz wnioski dotyczące indywidualnego programu rozwoju zawodowego (§ 11 ust. 1 pkt 5).'));
    }
    if (c.employee.status === 'urzednik-sc' && outcome === 'pozytywna' && !k.promotionRequest) {
      issues.push(error('Zdecyduj o wniosku o kolejny stopień służbowy (część III).'));
    }
    if (k.promotionRequest === 'tak' && !k.promotionJustification.trim()) {
      issues.push(error('Wniosek o kolejny stopień wymaga uzasadnienia.'));
    }
  } else if (!k.headOfUnitConfirmedAt) {
    issues.push(error('Odnotuj potwierdzenie kierującego komórką organizacyjną.'));
  }
  if (!k.draftedAt) {
    issues.push(error('Podaj datę sporządzenia oceny na piśmie.'));
  }
  if (!k.sheetGeneratedAt) {
    issues.push(error('Wygeneruj arkusz do podpisu.'));
  }
  if (!k.employeeAcknowledgedAt) {
    issues.push(error('Odnotuj datę zapoznania ocenianego z oceną.'));
  }
  return issues;
}

/** Pierwszy nieukończony krok ścieżki (ostatni, gdy wszystkie są ukończone). */
export function currentStepId(c: Pick<AssessmentCaseData, 'path' | 'steps'>): StepId {
  const steps = stepsFor(c.path);
  return (steps.find((step) => !c.steps[step.id]?.completedAt) ?? steps[steps.length - 1]).id;
}

export function isStepCompleted(c: Pick<AssessmentCaseData, 'steps'>, stepId: StepId): boolean {
  return Boolean(c.steps[stepId]?.completedAt);
}

/** Krok jest dostępny, gdy wszystkie wcześniejsze są ukończone. */
export function isStepReachable(c: Pick<AssessmentCaseData, 'path' | 'steps'>, stepId: StepId): boolean {
  const steps = stepsFor(c.path);
  const index = steps.findIndex((step) => step.id === stepId);
  return index >= 0 && steps.slice(0, index).every((step) => isStepCompleted(c, step.id));
}
