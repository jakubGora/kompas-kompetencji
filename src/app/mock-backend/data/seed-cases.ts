import type {
  AssessmentPath,
  CriterionRating,
  FormVariant,
  IndicatorAssessment,
  Observation,
  StepId,
  StepRecord,
  TopicStatus,
} from '@core/domain/assessment.model';
import type { BehaviorLevel } from '@core/domain/competency.model';
import { MANDATORY_CRITERIA, FIRST_ASSESSMENT_ELEMENTS, type CriterionId } from '@core/domain/criteria';
import type { IsoDate, IsoDateTime } from '@core/domain/date';
import type { Employee, PersonRef } from '@core/domain/people.model';
import type { ScorePoints } from '@core/domain/scales';
import { suggestCriterionScore } from '@core/domain/scoring';
import { stepsFor } from '@core/domain/workflow';
import { analyzePosition } from '../engine/position-analyzer';
import { createCase, historyEvent, personRef, type StoredCase } from '../engine/case-factory';
import { EMPLOYEES, ORG_UNITS, USERS } from './org';
import { POSITIONS } from './positions';

// — Pomocnicze —

const ts = (date: IsoDate, time = '09:00'): IsoDateTime => `${date}T${time}:00.000Z`;

function user(id: string): PersonRef {
  const found = USERS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Brak użytkownika ${id}`);
  return personRef(found);
}

function employee(id: string): Employee {
  const found = EMPLOYEES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Brak pracownika ${id}`);
  return found;
}

function position(id: string) {
  const found = POSITIONS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Brak stanowiska ${id}`);
  return found;
}

function orgUnitName(employeeRecord: Employee): string {
  return ORG_UNITS.find((unit) => unit.id === employeeRecord.orgUnitId)?.name ?? '';
}

const INDICATOR_COUNTS: Readonly<Record<CriterionId, number>> = {
  c01: 2, c02: 4, c03: 3, c04: 5, c05: 2, c06: 6, c07: 3, c08: 3, c09: 4, c10: 2, c11: 3, c12: 3, c13: 6, c14: 3,
};

const indicatorId = (criterionId: CriterionId, no: number) => `${criterionId}-i${String(no).padStart(2, '0')}`;

type LevelSpec = BehaviorLevel | 'nb' | null;

interface RatingSpec {
  readonly levels?: readonly LevelSpec[];
  readonly evidence?: readonly (readonly string[])[];
  readonly decision?: { readonly points: ScorePoints; readonly at: IsoDateTime; readonly rationale?: string };
}

function rating(path: AssessmentPath, criterionId: CriterionId, spec: RatingSpec, decidedById: string): CriterionRating {
  const indicators: IndicatorAssessment[] = (spec.levels ?? []).map((level, index) => ({
    indicatorId: indicatorId(criterionId, index + 1),
    level: level === 'nb' ? null : level,
    noBasis: level === 'nb',
    observationIds: spec.evidence?.[index] ?? [],
  }));
  const suggestion = suggestCriterionScore(path, indicators, INDICATOR_COUNTS[criterionId]);
  return {
    criterionId,
    indicators,
    decision: spec.decision
      ? {
          points: spec.decision.points,
          rationale: spec.decision.rationale ?? '',
          decidedAt: spec.decision.at,
          decidedById,
          suggestedPoints: indicators.length > 0 ? suggestion.points : null,
          suggestedAverage: indicators.length > 0 ? suggestion.average : null,
        }
      : null,
  };
}

function completed(path: AssessmentPath, until: StepId | null, dates: Partial<Record<StepId, IsoDateTime>>, byId: string) {
  const steps: Partial<Record<StepId, StepRecord>> = {};
  for (const step of stepsFor(path)) {
    if (until !== null && step.id === until) break;
    steps[step.id] = { completedAt: dates[step.id] ?? ts('2026-01-01'), completedById: byId };
  }
  return steps;
}

function allTopics(ids: readonly string[], overrides: Readonly<Record<string, TopicStatus>> = {}): Record<string, TopicStatus> {
  return Object.fromEntries(ids.map((id) => [id, overrides[id] ?? 'omowiono']));
}

function observation(
  id: string,
  authorId: string,
  data: Omit<Observation, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
): Observation {
  return { id, authorId, ...data, createdAt: ts(data.date, '16:20'), updatedAt: ts(data.date, '16:20') };
}

// — Anna Nowak: główny scenariusz demo (arkusz C, etap ocen) —

function annaCase(): StoredCase {
  const piotr = user('u-piotr');
  const marta = user('u-marta');
  const anna = employee('e-anna');
  const pos = position('pos-dc-wzksoic-6');
  const base = createCase({
    id: 'case-anna',
    path: 'periodic',
    employee: anna,
    position: pos,
    evaluator: piotr,
    orgUnitName: orgUnitName(anna),
    createdAt: ts('2024-10-15', '08:30'),
    createdBy: marta,
  });

  const o = (n: number) => `obs-anna-${n}`;
  const observations: Observation[] = [
    observation(o(1), piotr.id, {
      date: '2025-03-14',
      title: 'Ćwiczenia NATO Cyber Coalition',
      positionTaskId: 'dc6-t2',
      description: 'Przygotowała harmonogram; 2 tygodnie wcześniej wskazała ryzyko opóźnienia tłumaczeń.',
      criterionIds: ['c01', 'c04'],
      indicatorIds: ['c01-i02', 'c04-i01', 'c04-i02'],
    }),
    observation(o(2), piotr.id, {
      date: '2025-06-18',
      title: 'Współpraca międzyresortowa',
      positionTaskId: 'dc6-t3',
      description: 'Uzgodniła wkład trzech zespołów; udostępniła wspólną listę ustaleń.',
      criterionIds: ['c06', 'c02'],
      indicatorIds: ['c06-i01', 'c06-i02', 'c02-i03'],
    }),
    observation(o(3), piotr.id, {
      date: '2025-09-16',
      title: 'Kontrola podmiotu krytycznego',
      positionTaskId: 'dc6-t7',
      description: 'Wykryła rozbieżność w dokumentacji i zaproponowała dwa warianty rozwiązania.',
      criterionIds: ['c07', 'c14'],
      indicatorIds: ['c07-i01', 'c07-i02', 'c07-i03', 'c14-i01'],
    }),
    observation(o(4), piotr.id, {
      date: '2026-02-12',
      title: 'Incydent przy stopniu alarmowym',
      positionTaskId: 'dc6-t5',
      description: 'Powiadomiła właściwe osoby według procedury, ale komunikat był niepełny.',
      criterionIds: ['c11', 'c02'],
      indicatorIds: ['c11-i01', 'c11-i02', 'c02-i03'],
    }),
    observation(o(5), piotr.id, {
      date: '2026-05-22',
      title: 'Aktualizacja procedury',
      positionTaskId: 'dc6-t4',
      description: 'Uwzględniła zmiany przepisów i przekazała zespołowi praktyczne wskazówki.',
      criterionIds: ['c03', 'c06'],
      indicatorIds: ['c03-i01', 'c03-i02', 'c06-i06'],
    }),
    observation(o(6), piotr.id, {
      date: '2026-09-08',
      title: 'Plan reagowania kryzysowego',
      positionTaskId: 'dc6-t1',
      description: 'Rozpisała zależności między działaniami i przypisała ich właścicieli; rozdział przyjęto bez uwag.',
      criterionIds: ['c04', 'c14'],
      indicatorIds: ['c04-i03', 'c04-i05', 'c14-i02', 'c14-i03'],
    }),
  ];

  const at = (time: string) => ts('2026-11-20', time);
  const ratings: CriterionRating[] = [
    rating('periodic', 'c03', { levels: [4, 4, 3], evidence: [[o(5)], [o(5)], [o(3)]] }, piotr.id),
    rating('periodic', 'c01', { levels: [4, 4], evidence: [[o(5)], [o(1)]], decision: { points: 7, at: at('14:05') } }, piotr.id),
    rating(
      'periodic',
      'c04',
      { levels: [4, 3, 3, 4, 4], evidence: [[o(1)], [o(1)], [o(6)], [], [o(6)]], decision: { points: 7, at: at('14:12') } },
      piotr.id,
    ),
    rating(
      'periodic',
      'c06',
      { levels: [3, 4, 3, 'nb', 3, 3], evidence: [[o(2)], [o(2)], [], [], [], [o(5)]], decision: { points: 5, at: at('14:20') } },
      piotr.id,
    ),
    rating(
      'periodic',
      'c02',
      { levels: [3, 3, 3, 4], evidence: [[], [o(2)], [o(2), o(4)], [o(3)]], decision: { points: 5, at: at('14:26') } },
      piotr.id,
    ),
    rating('periodic', 'c07', { levels: [5, 4, 4], evidence: [[o(3)], [o(3)], [o(3)]], decision: { points: 7, at: at('14:31') } }, piotr.id),
    rating('periodic', 'c11', { levels: [2, 3, 3], evidence: [[o(4)], [o(4)], []], decision: { points: 5, at: at('14:38') } }, piotr.id),
    rating(
      'periodic',
      'c14',
      {
        levels: [4, 3, 3],
        evidence: [[o(3)], [o(6)], [o(6)]],
        decision: {
          points: 7,
          at: at('14:46'),
          rationale:
            'Przy planie reagowania (08.09.2026) samodzielnie zaproponowała kolejność wdrożenia i przyjęła odpowiedzialność za harmonogram; podobnie przy kontroli z 16.09.2025 przygotowała warianty z ryzykami. Zachowanie jest powtarzalne i dotyczy zadań o dużej złożoności.',
        },
      },
      piotr.id,
    ),
  ];

  return {
    ...base,
    updatedAt: at('14:46'),
    steps: completed(
      'periodic',
      'ocena',
      {
        stanowisko: ts('2024-10-28', '09:12'),
        kryteria: ts('2024-10-28', '09:40'),
        'rozmowa-wstepna': ts('2024-11-05', '12:20'),
        obserwacje: ts('2026-11-17', '15:30'),
        'rozmowa-oceniajaca': ts('2026-11-18', '11:30'),
      },
      piotr.id,
    ),
    deadlines: {
      ...base.deadlines,
      extensions: base.deadlines.extensions.map((extension) => ({ ...extension, employeeNotifiedAt: '2025-05-26' })),
    },
    positionReview: {
      analysis: analyzePosition(pos, ts('2024-10-28', '09:05')),
      confirmedVariant: 'C',
      confirmedAt: ts('2024-10-28', '09:12'),
    },
    criteria: { additional: ['c07', 'c11', 'c14'], rejectedSuggestions: ['c08'], approvedAt: ts('2024-10-28', '09:40') },
    preliminary: {
      meetingDate: '2024-11-05',
      topics: allTopics(['obowiazki', 'kryteria', 'oczekiwania', 'cele']),
      expectations: [
        { criterionId: 'c03', text: 'Stosuje aktualne przepisy o KSC i zarządzaniu kryzysowym w dokumentach i opiniach; uzupełnia wiedzę po zmianach przepisów.' },
        { criterionId: 'c01', text: 'Przygotowuje dokumentację zgodnie z procedurami wydziału, dotrzymuje terminów i wcześnie sygnalizuje ryzyko opóźnień.' },
        { criterionId: 'c04', text: 'Planuje udział w ćwiczeniach i kontrolach z wyprzedzeniem, ustala priorytety i dobiera potrzebne zasoby.' },
        { criterionId: 'c06', text: 'Uzgadnia wkład z zespołami CSIRT i innymi komórkami; dba o przepływ informacji po spotkaniach.' },
        { criterionId: 'c02', text: 'Przekazuje jasne i kompletne komunikaty pisemne — szczególnie w czasie incydentów.' },
        { criterionId: 'c07', text: 'Zestawia dane z różnych źródeł, dostrzega rozbieżności i formułuje wnioski z rekomendacjami.' },
        { criterionId: 'c11', text: 'Rozpoznaje sytuacje kryzysowe według kryteriów eskalacji i informuje właściwe osoby o faktach, skali i działaniach.' },
        { criterionId: 'c14', text: 'Przygotowuje warianty rozwiązań z oceną ryzyka i podejmuje decyzje w zakresie uzgodnionym z przełożonym.' },
      ],
      goals: [
        {
          id: 'goal-anna-1',
          text: 'Współprowadzenie aktualizacji rozdziału Krajowego planu reagowania dotyczącego współdziałania z operatorami.',
          measure: 'Projekt rozdziału przekazany do uzgodnień do 30.09.2026 r.',
        },
        {
          id: 'goal-anna-2',
          text: 'Przeprowadzenie co najmniej dwóch kontroli podmiotów krytycznych.',
          measure: 'Protokoły kontroli sporządzone w terminie.',
        },
      ],
      notes: 'Uzgodniono comiesięczne krótkie podsumowania postępów.',
      assessmentDueDate: '2026-10-10',
      employeeAcknowledgedAt: '2024-11-05',
    },
    observations,
    review: {
      meetingDate: '2026-11-18',
      topics: allTopics(['obowiazki', 'cele', 'rozwoj']),
      notes:
        'Omówiono realizację zadań z OSP: ćwiczenie NATO (03.2025), kontrolę podmiotu krytycznego (09.2025) i aktualizację planu reagowania (09.2026). Oba cele zrealizowano. Anna sama wskazała, że komunikat z 12.02.2026 był niepełny — uzgodniliśmy szablon komunikatu incydentowego.',
      employeePerspective:
        'Najtrudniejsze były dyżury w czasie stopnia alarmowego. Chce rozwijać się w prowadzeniu ćwiczeń i w reprezentowaniu wydziału w grupach UE.',
      developmentNeeds:
        'Struktura komunikatu w sytuacji kryzysowej, koordynowanie ćwiczeń, negocjacje w środowisku międzynarodowym.',
      planGeneratedAt: ts('2026-11-17', '15:40'),
    },
    ratings,
    conclusion: { justification: '', developmentPlan: '', promotionRequest: 'nie-dotyczy', promotionJustification: '' },
    documents: [
      { id: 'doc-anna-1', kind: 'czesc-i', title: 'Arkusz C — część I (kryteria i termin)', status: 'podpisany', createdAt: ts('2024-11-05', '12:15'), version: 1 },
      { id: 'doc-anna-2', kind: 'zawiadomienie-o-terminie', title: 'Zawiadomienie o nowym terminie oceny (§ 8)', status: 'podpisany', createdAt: ts('2025-05-26', '10:00'), version: 1 },
      { id: 'doc-anna-3', kind: 'plan-rozmowy', title: 'Plan rozmowy oceniającej', status: 'wygenerowany', createdAt: ts('2026-11-17', '15:40'), version: 1 },
    ],
    history: [
      ...base.history,
      historyEvent(ts('2024-10-28', '09:05'), piotr, 'krok', 'Asystent przeanalizował OSP: rekomendacja arkusza C.', 'stanowisko'),
      historyEvent(ts('2024-10-28', '09:12'), piotr, 'krok', 'Potwierdzono arkusz C.', 'stanowisko'),
      historyEvent(ts('2024-10-28', '09:40'), piotr, 'krok', 'Zatwierdzono kryteria dodatkowe: myślenie analityczne, sytuacje kryzysowe, podejmowanie decyzji. Odrzucono sugestię: negocjowanie.', 'kryteria'),
      historyEvent(ts('2024-11-05', '12:20'), piotr, 'dokument', 'Część I podpisana przez ocenianą (początek okresu oceny).', 'rozmowa-wstepna'),
      ...observations.map((item) => historyEvent(item.createdAt, piotr, 'obserwacja', `Dodano obserwację: ${item.title}.`, 'obserwacje')),
      historyEvent(ts('2025-05-26', '10:00'), piotr, 'termin', 'Przedłużono termin oceny o 42 dni (art. 81 ust. 7); oceniana zawiadomiona pisemnie.'),
      historyEvent(ts('2026-10-20', '08:00'), marta, 'przypomnienie', 'Kadry przypomniały o terminie oceny 21.11.2026.'),
      historyEvent(ts('2026-11-17', '15:40'), piotr, 'dokument', 'Wygenerowano plan rozmowy oceniającej.', 'rozmowa-oceniajaca'),
      historyEvent(ts('2026-11-18', '11:30'), piotr, 'krok', 'Przeprowadzono rozmowę oceniającą.', 'rozmowa-oceniajaca'),
      ...ratings
        .filter((item) => item.decision)
        .map((item) =>
          historyEvent(
            item.decision!.decidedAt,
            piotr,
            item.decision!.points !== item.decision!.suggestedPoints ? 'odstepstwo' : 'decyzja',
            item.decision!.points !== item.decision!.suggestedPoints
              ? `Ocena cząstkowa ${item.decision!.points} pkt (${item.criterionId}) — inna niż sugestia ${item.decision!.suggestedPoints} pkt, z uzasadnieniem.`
              : `Ocena cząstkowa ${item.decision!.points} pkt (${item.criterionId}) zgodna z sugestią.`,
            'ocena',
          ),
        ),
    ],
  };
}

// — Ewa Jankowska: nowy proces (krok 1, demo analizy OSP na żywo) —

function ewaCase(): StoredCase {
  const ewa = employee('e-ewa-jankowska');
  return createCase({
    id: 'case-ewa',
    path: 'periodic',
    employee: ewa,
    position: position(ewa.positionId),
    evaluator: user('u-piotr'),
    orgUnitName: orgUnitName(ewa),
    createdAt: ts('2026-11-16', '09:05'),
    createdBy: user('u-marta'),
  });
}

// — Michał Kamiński: etap obserwacji —

function michalCase(): StoredCase {
  const piotr = user('u-piotr');
  const michal = employee('e-michal');
  const pos = position(michal.positionId);
  const base = createCase({
    id: 'case-michal',
    path: 'periodic',
    employee: michal,
    position: pos,
    evaluator: piotr,
    orgUnitName: orgUnitName(michal),
    createdAt: ts('2024-12-18', '10:00'),
    createdBy: user('u-marta'),
  });
  const observations = [
    observation('obs-michal-1', piotr.id, {
      date: '2025-06-03',
      title: 'Rejestr zgłoszeń po zmianie formularza',
      positionTaskId: 'dc4-t1',
      description:
        'Po zmianie formularza przez zespoły CSIRT w dwa dni dostosował rejestr i sprawdził 40 ostatnich wpisów; rejestr był kompletny przed raportem kwartalnym.',
      criterionIds: ['c01', 'c03'],
      indicatorIds: ['c01-i01', 'c03-i03'],
    }),
    observation('obs-michal-2', piotr.id, {
      date: '2025-11-20',
      title: 'Odpowiedź na zapytanie gminy',
      positionTaskId: 'dc4-t5',
      description:
        'Zadzwonił do gminy, by upewnić się, że dobrze zrozumiał pytanie, i w 5 dni wysłał odpowiedź z odwołaniem do przepisów; gmina nie miała dalszych pytań.',
      criterionIds: ['c10', 'c02'],
      indicatorIds: ['c10-i02', 'c02-i01', 'c02-i03'],
    }),
    observation('obs-michal-3', piotr.id, {
      date: '2026-06-12',
      title: 'Ćwiczenie łączności kryzysowej',
      positionTaskId: 'dc4-t3',
      description:
        'Podczas ćwiczenia zauważył nieaktualny numer dyżurny i od razu poinformował koordynatora; wykaz poprawiono bez przerywania scenariusza.',
      criterionIds: ['c11', 'c06'],
      indicatorIds: ['c11-i01', 'c06-i02'],
    }),
  ];
  return {
    ...base,
    updatedAt: ts('2026-06-12', '16:20'),
    steps: completed(
      'periodic',
      'obserwacje',
      { stanowisko: ts('2025-01-08', '10:10'), kryteria: ts('2025-01-08', '10:30'), 'rozmowa-wstepna': ts('2025-01-10', '13:00') },
      piotr.id,
    ),
    positionReview: { analysis: analyzePosition(pos, ts('2025-01-08', '10:05')), confirmedVariant: 'C', confirmedAt: ts('2025-01-08', '10:10') },
    criteria: { additional: ['c11', 'c10'], rejectedSuggestions: [], approvedAt: ts('2025-01-08', '10:30') },
    preliminary: {
      meetingDate: '2025-01-10',
      topics: allTopics(['obowiazki', 'kryteria', 'oczekiwania', 'cele'], { cele: 'nie-dotyczy' }),
      expectations: (['c03', 'c01', 'c04', 'c06', 'c02', 'c11', 'c10'] as const).map((criterionId) => ({
        criterionId,
        text: 'Wykonuje zadania z OSP zgodnie ze standardem opisanym na poziomie „na poziomie oczekiwań” w modelu kompetencji.',
      })),
      goals: [],
      notes: '',
      assessmentDueDate: '2026-12-15',
      employeeAcknowledgedAt: '2025-01-10',
    },
    observations,
    history: [
      ...base.history,
      historyEvent(ts('2025-01-10', '13:00'), piotr, 'dokument', 'Część I podpisana przez ocenianego.', 'rozmowa-wstepna'),
      ...observations.map((item) => historyEvent(item.createdAt, piotr, 'obserwacja', `Dodano obserwację: ${item.title}.`, 'obserwacje')),
    ],
  };
}

// — Zofia Krawczyk: pierwsza ocena (rozmowa oceniająca) —

function zofiaCase(): StoredCase {
  const piotr = user('u-piotr');
  const zofia = employee('e-zofia');
  const base = createCase({
    id: 'case-zofia',
    path: 'first',
    employee: zofia,
    position: position(zofia.positionId),
    evaluator: piotr,
    headOfUnit: user('u-adam'),
    orgUnitName: orgUnitName(zofia),
    createdAt: ts('2026-03-03', '08:30'),
    createdBy: user('u-marta'),
  });
  const observations = [
    observation('obs-zofia-1', piotr.id, {
      date: '2026-05-12',
      title: 'Porządkowanie ewidencji dokumentacji',
      positionTaskId: 'dc9-t1',
      description:
        'Po migracji porównała wykaz dokumentacji z archiwum, oznaczyła 12 braków i uzgodniła ich uzupełnienie z autorami; ewidencja była kompletna przed audytem.',
      criterionIds: ['c01', 'c06'],
      indicatorIds: ['c01-i01', 'c06-i02'],
    }),
    observation('obs-zofia-2', piotr.id, {
      date: '2026-07-08',
      title: 'Materiały na posiedzenie zespołu',
      positionTaskId: 'dc9-t2',
      description:
        'Przygotowała materiały dzień po terminie, bo nie zapytała wcześniej o brakujące dane; uczestnicy mieli mniej czasu na zapoznanie się z nimi.',
      criterionIds: ['c01', 'c02'],
      indicatorIds: ['c01-i02', 'c02-i01'],
    }),
    observation('obs-zofia-3', piotr.id, {
      date: '2026-09-24',
      title: 'Szkolenie z obiegu informacji',
      positionTaskId: 'dc9-t3',
      description:
        'Po szkoleniu z obiegu informacji zaproponowała aktualizację wykazu kontaktów i sama ją przeprowadziła; dyżurni korzystają z nowej wersji.',
      criterionIds: ['c03', 'c04'],
      indicatorIds: ['c03-i02', 'c04-i05'],
    }),
  ];
  return {
    ...base,
    updatedAt: ts('2026-11-18', '10:00'),
    steps: completed(
      'first',
      'rozmowa-oceniajaca',
      {
        'rozmowa-wstepna': ts('2026-03-16', '11:00'),
        'sluzba-przygotowawcza': ts('2026-06-30', '09:00'),
        obserwacje: ts('2026-11-18', '09:30'),
        sprawozdanie: ts('2026-11-18', '10:00'),
      },
      piotr.id,
    ),
    preliminary: {
      meetingDate: '2026-03-16',
      topics: allTopics(['sposob-oceny', 'obowiazki', 'postawa', 'sprawozdanie']),
      expectations: FIRST_ASSESSMENT_ELEMENTS.map((criterionId) => ({
        criterionId,
        text: 'Wykonuje zadania zgodnie z opisem zachowań na poziomie oczekiwań, zgłasza wątpliwości i dotrzymuje terminów.',
      })),
      goals: [],
      notes: 'Omówiono zasady służby przygotowawczej i harmonogram egzaminu.',
      reportWindow: { from: '2026-11-03', to: '2026-11-20' },
      assessmentWindow: { from: base.deadlines.windowStart, to: base.deadlines.dueDate },
      employeeAcknowledgedAt: '2026-03-16',
    },
    preparatoryService: { outcome: 'zaliczony', examDate: '2026-06-26', note: '' },
    report: {
      status: 'zlozone',
      submittedAt: '2026-11-17',
      coverage: { from: '2026-03-02', to: '2026-10-31' },
      summary: {
        tasks: 'Prowadzenie ewidencji dokumentacji, przygotowanie materiałów na posiedzenia, udział w dwóch ćwiczeniach.',
        problems: 'Braki w ewidencji po migracji systemu — uzupełnione we współpracy z autorami dokumentów.',
        skills: 'Obsługa systemu EZD, zasady obiegu informacji niejawnych, procedury stopni alarmowych.',
        improvements: 'Szablon zestawienia materiałów na posiedzenia z listą kontrolną terminów.',
      },
    },
    observations,
    history: [
      ...base.history,
      historyEvent(ts('2026-03-16', '11:00'), piotr, 'dokument', 'Rozmowa wstępna; wyznaczono termin sprawozdania 03–20.11.2026.', 'rozmowa-wstepna'),
      historyEvent(ts('2026-06-30', '09:00'), piotr, 'krok', 'Odnotowano zaliczenie egzaminu ze służby przygotowawczej.', 'sluzba-przygotowawcza'),
      ...observations.map((item) => historyEvent(item.createdAt, piotr, 'obserwacja', `Dodano obserwację: ${item.title}.`, 'obserwacje')),
      historyEvent(ts('2026-11-18', '10:00'), piotr, 'krok', 'Sprawozdanie złożone 17.11.2026 — w terminie.', 'sprawozdanie'),
    ],
  };
}

// — Jan Kowalski (Ewa Mazur): rozmowa wstępna do 27.11.2026 —

function janCase(): StoredCase {
  const mazur = user('u-ewa-mazur');
  const jan = employee('e-jan');
  const pos = position(jan.positionId);
  const base = createCase({
    id: 'case-jan',
    path: 'periodic',
    employee: jan,
    position: pos,
    evaluator: mazur,
    orgUnitName: orgUnitName(jan),
    createdAt: ts('2026-11-02', '09:00'),
    createdBy: user('u-marta'),
  });
  return {
    ...base,
    updatedAt: ts('2026-11-12', '12:10'),
    steps: completed('periodic', 'rozmowa-wstepna', { stanowisko: ts('2026-11-12', '11:50'), kryteria: ts('2026-11-12', '12:10') }, mazur.id),
    positionReview: { analysis: analyzePosition(pos, ts('2026-11-12', '11:45')), confirmedVariant: 'C', confirmedAt: ts('2026-11-12', '11:50') },
    criteria: { additional: ['c07', 'c05'], rejectedSuggestions: [], approvedAt: ts('2026-11-12', '12:10') },
    history: [
      ...base.history,
      historyEvent(ts('2026-11-12', '11:50'), mazur, 'krok', 'Potwierdzono arkusz C.', 'stanowisko'),
      historyEvent(ts('2026-11-12', '12:10'), mazur, 'krok', 'Zatwierdzono kryteria dodatkowe: myślenie analityczne, kreatywność.', 'kryteria'),
    ],
  };
}

// — Paweł Wróbel (Karolina Sowa): arkusz B, wybór kryteriów —

function pawelCase(): StoredCase {
  const sowa = user('u-karolina');
  const pawel = employee('e-pawel');
  const pos = position(pawel.positionId);
  const base = createCase({
    id: 'case-pawel',
    path: 'periodic',
    employee: pawel,
    position: pos,
    evaluator: sowa,
    orgUnitName: orgUnitName(pawel),
    createdAt: ts('2026-11-04', '09:00'),
    createdBy: user('u-marta'),
  });
  return {
    ...base,
    updatedAt: ts('2026-11-10', '10:20'),
    steps: completed('periodic', 'kryteria', { stanowisko: ts('2026-11-10', '10:20') }, sowa.id),
    positionReview: { analysis: analyzePosition(pos, ts('2026-11-10', '10:15')), confirmedVariant: 'B', confirmedAt: ts('2026-11-10', '10:20') },
    history: [...base.history, historyEvent(ts('2026-11-10', '10:20'), sowa, 'krok', 'Potwierdzono arkusz B (kieruje 5–9 pracownikami).', 'stanowisko')],
  };
}

// — Katarzyna Wójcik (Tomasz Lis): arkusz wygenerowany, czeka na zapoznanie —

function katarzynaCase(): StoredCase {
  const lis = user('u-tomasz');
  const katarzyna = employee('e-katarzyna');
  const pos = position(katarzyna.positionId);
  const base = createCase({
    id: 'case-katarzyna',
    path: 'periodic',
    employee: katarzyna,
    position: pos,
    evaluator: lis,
    orgUnitName: orgUnitName(katarzyna),
    createdAt: ts('2024-11-25', '09:00'),
    createdBy: user('u-marta'),
  });
  const criteria: CriterionId[] = [...MANDATORY_CRITERIA.C, 'c10', 'c05'];
  const points: ScorePoints[] = [7, 7, 7, 7, 5, 7, 7];
  return {
    ...base,
    updatedAt: ts('2026-11-19', '14:10'),
    steps: completed(
      'periodic',
      'podsumowanie',
      {
        stanowisko: ts('2024-12-02', '10:00'),
        kryteria: ts('2024-12-02', '10:20'),
        'rozmowa-wstepna': ts('2024-12-10', '12:00'),
        obserwacje: ts('2026-11-12', '09:00'),
        'rozmowa-oceniajaca': ts('2026-11-17', '13:00'),
        ocena: ts('2026-11-19', '13:40'),
      },
      lis.id,
    ),
    positionReview: { analysis: analyzePosition(pos, ts('2024-12-02', '09:55')), confirmedVariant: 'C', confirmedAt: ts('2024-12-02', '10:00') },
    criteria: { additional: ['c10', 'c05'], rejectedSuggestions: [], approvedAt: ts('2024-12-02', '10:20') },
    preliminary: {
      meetingDate: '2024-12-10',
      topics: allTopics(['obowiazki', 'kryteria', 'oczekiwania', 'cele'], { cele: 'nie-dotyczy' }),
      expectations: criteria.map((criterionId) => ({ criterionId, text: 'Zgodnie ze standardem „na poziomie oczekiwań” w modelu kompetencji.' })),
      goals: [],
      notes: '',
      assessmentDueDate: '2026-11-20',
      employeeAcknowledgedAt: '2024-12-10',
    },
    review: {
      meetingDate: '2026-11-17',
      topics: allTopics(['obowiazki', 'cele', 'rozwoj'], { cele: 'nie-dotyczy' }),
      notes: 'Omówiono wdrożenie EZD w czterech komórkach i szkolenia dla pracowników.',
      employeePerspective: 'Chce prowadzić projekt usprawnienia obiegu pism w całym urzędzie.',
      developmentNeeds: 'Zarządzanie projektem, warsztaty z facylitacji.',
    },
    ratings: criteria.map((criterionId, index) =>
      rating('periodic', criterionId, { decision: { points: points[index], at: ts('2026-11-19', '13:30') } }, lis.id),
    ),
    conclusion: {
      justification:
        'Oceniana skutecznie koordynowała wdrożenie elektronicznego zarządzania dokumentacją w czterech komórkach, terminowo i z dbałością o potrzeby użytkowników.',
      developmentPlan: 'Szkolenie z zarządzania projektami; warsztaty z facylitacji spotkań; udział w zespole ds. usprawnień organizacyjnych.',
      promotionRequest: 'tak',
      promotionJustification:
        'Druga z rzędu ocena na poziomie „powyżej oczekiwań”; samodzielne prowadzenie wdrożenia EZD i szkoleń dla pracowników urzędu.',
      draftedAt: '2026-11-19',
      sheetGeneratedAt: ts('2026-11-19', '14:10'),
    },
    documents: [
      { id: 'doc-kw-1', kind: 'czesc-i', title: 'Arkusz C — część I (kryteria i termin)', status: 'podpisany', createdAt: ts('2024-12-10', '12:00'), version: 1 },
      { id: 'doc-kw-2', kind: 'arkusz-okresowy', title: 'Arkusz oceny okresowej C — części I–III', status: 'wygenerowany', createdAt: ts('2026-11-19', '14:10'), version: 1 },
    ],
    history: [...base.history, historyEvent(ts('2026-11-19', '14:10'), lis, 'dokument', 'Wygenerowano arkusz do podpisu.', 'podsumowanie')],
  };
}

// — Oceny zakończone (historia) —

interface HistoricalSpec {
  readonly id: string;
  readonly employeeId: string;
  readonly evaluatorId: string;
  readonly variant: FormVariant;
  readonly additional: readonly CriterionId[];
  readonly points: readonly ScorePoints[];
  readonly partOneAt: IsoDate;
  readonly draftedAt: IsoDate;
  readonly acknowledgedAt: IsoDate;
}

function historicalCase(spec: HistoricalSpec): StoredCase {
  const evaluator = user(spec.evaluatorId);
  const record = employee(spec.employeeId);
  const pos = position(record.positionId);
  const criteria: CriterionId[] = [...MANDATORY_CRITERIA[spec.variant], ...spec.additional];
  const base = createCase({
    id: spec.id,
    path: 'periodic',
    employee: record,
    position: pos,
    evaluator,
    orgUnitName: orgUnitName(record),
    createdAt: ts(spec.partOneAt, '08:00'),
    createdBy: user('u-marta'),
  });
  const done = ts(spec.acknowledgedAt, '12:00');
  return {
    ...base,
    status: 'zakonczona',
    updatedAt: done,
    steps: completed('periodic', null, Object.fromEntries(stepsFor('periodic').map((step) => [step.id, done])), evaluator.id),
    deadlines: { ...base.deadlines, dueDate: spec.draftedAt },
    positionReview: { confirmedVariant: spec.variant, confirmedAt: ts(spec.partOneAt, '08:00') },
    criteria: { additional: spec.additional, rejectedSuggestions: [], approvedAt: ts(spec.partOneAt, '08:10') },
    preliminary: { ...base.preliminary, meetingDate: spec.partOneAt, employeeAcknowledgedAt: spec.partOneAt },
    ratings: criteria.map((criterionId, index) =>
      rating('periodic', criterionId, { decision: { points: spec.points[index] ?? 5, at: ts(spec.draftedAt, '10:00') } }, evaluator.id),
    ),
    conclusion: {
      justification: '',
      developmentPlan: 'Wnioski do IPRZ zapisane w arkuszu.',
      promotionRequest: record.status === 'urzednik-sc' ? 'nie' : 'nie-dotyczy',
      promotionJustification: '',
      draftedAt: spec.draftedAt,
      sheetGeneratedAt: ts(spec.draftedAt, '11:00'),
      employeeAcknowledgedAt: spec.acknowledgedAt,
    },
    documents: [
      { id: `${spec.id}-doc`, kind: 'arkusz-okresowy', title: `Arkusz oceny okresowej ${spec.variant}`, status: 'podpisany', createdAt: ts(spec.draftedAt, '11:00'), version: 1 },
    ],
    history: [...base.history, historyEvent(done, evaluator, 'zapoznanie', 'Oceniany zapoznał się z oceną.', 'podsumowanie')],
  };
}

const HISTORICAL: readonly HistoricalSpec[] = [
  { id: 'hist-anna-2024', employeeId: 'e-anna', evaluatorId: 'u-piotr', variant: 'C', additional: ['c07', 'c11', 'c14'], points: [5, 5, 5, 5, 5, 7, 5, 5], partOneAt: '2022-11-03', draftedAt: '2024-10-10', acknowledgedAt: '2024-10-14' },
  { id: 'hist-michal-2024', employeeId: 'e-michal', evaluatorId: 'u-piotr', variant: 'C', additional: ['c11'], points: [5, 5, 5, 5, 5, 5], partOneAt: '2023-01-12', draftedAt: '2024-12-15', acknowledgedAt: '2024-12-18' },
  { id: 'hist-ewa-2026', employeeId: 'e-ewa-jankowska', evaluatorId: 'u-piotr', variant: 'C', additional: ['c07', 'c11', 'c14'], points: [7, 7, 7, 5, 7, 7, 7, 5], partOneAt: '2024-11-25', draftedAt: '2026-11-06', acknowledgedAt: '2026-11-09' },
  { id: 'hist-marek-2026', employeeId: 'e-marek', evaluatorId: 'u-piotr', variant: 'C', additional: ['c09', 'c08', 'c11'], points: [9, 9, 9, 7, 9, 9, 9, 9], partOneAt: '2024-12-02', draftedAt: '2026-11-12', acknowledgedAt: '2026-11-13' },
  { id: 'hist-jan-2026', employeeId: 'e-jan', evaluatorId: 'u-ewa-mazur', variant: 'C', additional: ['c07', 'c05'], points: [5, 5, 5, 5, 5, 5, 7], partOneAt: '2024-11-20', draftedAt: '2026-10-28', acknowledgedAt: '2026-10-30' },
  { id: 'hist-pawel-2026', employeeId: 'e-pawel', evaluatorId: 'u-karolina', variant: 'B', additional: ['c09', 'c12'], points: [7, 7, 7, 7, 5, 7, 7], partOneAt: '2024-11-22', draftedAt: '2026-10-30', acknowledgedAt: '2026-11-03' },
  { id: 'hist-katarzyna-2024', employeeId: 'e-katarzyna', evaluatorId: 'u-tomasz', variant: 'C', additional: ['c10'], points: [7, 7, 7, 5, 7, 7], partOneAt: '2022-12-01', draftedAt: '2024-11-20', acknowledgedAt: '2024-11-22' },
];

export function seedCases(): StoredCase[] {
  return [
    annaCase(),
    ewaCase(),
    michalCase(),
    zofiaCase(),
    janCase(),
    pawelCase(),
    katarzynaCase(),
    ...HISTORICAL.map(historicalCase),
  ];
}
