import type { FormVariant } from '@core/domain/assessment.model';
import { CRITERIA, MANDATORY_CRITERIA, type CriterionId } from '@core/domain/criteria';
import type { IsoDateTime } from '@core/domain/date';
import type {
  AdditionalCriterionSuggestion,
  Confidence,
  EvidenceQuote,
  Position,
  PositionAnalysis,
} from '@core/domain/position.model';
import { matchStems, normalize, sentences, truncate } from './text';

export const ANALYZER_MODEL = 'kompas-mock-ai 0.3 (reguły + słowa kluczowe, offline)';

interface CriterionSignal {
  readonly criterionId: CriterionId;
  readonly stems: readonly string[];
  readonly rationale: string;
}

const SIGNALS: readonly CriterionSignal[] = [
  {
    criterionId: 'c11',
    stems: ['kryzys', 'incydent', 'alarm', 'zagrozen', 'dyzur', 'reagowani'],
    rationale: 'Zadania obejmują zarządzanie kryzysowe i reagowanie na incydenty.',
  },
  {
    criterionId: 'c07',
    stems: ['analiz', 'dokonuje oceny', 'interpretac', 'rozbieznos', 'identyfik', 'formuluje opini'],
    rationale: 'Stanowisko wymaga analizy informacji i formułowania wniosków.',
  },
  {
    criterionId: 'c14',
    stems: ['samodzielne podejmowanie decyzji', 'decyzji uznaniowych', 'decyzje', 'autonomicznych decyzji'],
    rationale: 'OSP wskazuje na samodzielne podejmowanie decyzji.',
  },
  {
    criterionId: 'c08',
    stems: ['negocj', 'reprezentowania rp', 'reprezentuje', 'uzgodnien', 'przekonywania', 'godzenie interesow'],
    rationale: 'Zadania obejmują reprezentowanie urzędu i uzgadnianie stanowisk z partnerami.',
  },
  {
    criterionId: 'c09',
    stems: ['wystapien', 'konferencj', 'prezentac', 'prowadzi szkolenia', 'seminari'],
    rationale: 'Stanowisko wiąże się z wystąpieniami i prowadzeniem szkoleń.',
  },
  {
    criterionId: 'c10',
    stems: ['klient', 'interesant', 'odpowiedzi na pisma', 'odpowiedzi na zapytania', 'udziela odpowiedzi'],
    rationale: 'Zadania obejmują obsługę zapytań odbiorców zewnętrznych lub wewnętrznych.',
  },
  {
    criterionId: 'c05',
    stems: ['nowych rozwiazan', 'nowe koncepcje', 'nowych zasad', 'innowac', 'propozycje zmian', 'usprawni'],
    rationale: 'Od osoby na stanowisku oczekuje się proponowania nowych rozwiązań.',
  },
  {
    criterionId: 'c12',
    stems: ['strateg', 'polityki', 'perspektyw', 'wizj'],
    rationale: 'Zadania mają wymiar strategiczny lub polityczny.',
  },
  {
    criterionId: 'c03',
    stems: ['wiedzy eksperckiej', 'specjalistyczna wiedze', 'ekspert'],
    rationale: 'Stanowisko wymaga wiedzy eksperckiej.',
  },
  {
    criterionId: 'c01',
    stems: ['rzeteln', 'terminow', 'kontrol', 'procedur'],
    rationale: 'Zadania wymagają rzetelności i zgodności z procedurami.',
  },
];

interface ScoredSignal {
  readonly signal: CriterionSignal;
  readonly score: number;
  readonly evidence: EvidenceQuote[];
}

function scoreSignal(position: Position, signal: CriterionSignal): ScoredSignal {
  let score = 0;
  const evidence: EvidenceQuote[] = [];

  for (const task of position.tasks) {
    const hits = matchStems(task.text, signal.stems);
    if (hits.length > 0) {
      score += hits.length * (task.kind === 'dominujace' ? 3 : 2);
      evidence.push({
        text: truncate(task.text),
        location: `Zadanie ${task.no} (${task.kind === 'dominujace' ? 'dominujące' : 'pozostałe'})`,
        taskId: task.id,
      });
    }
  }

  const extraSections: readonly [string, string][] = [
    ['Niezbędna samodzielność i inicjatywa', position.independence],
    ['Upoważnienia i pełnomocnictwa', position.authorizations.join('. ')],
    ['Cel istnienia stanowiska', position.purpose],
  ];
  for (const [location, text] of extraSections) {
    for (const sentence of sentences(text)) {
      const hits = matchStems(sentence, signal.stems);
      if (hits.length > 0) {
        score += hits.length;
        evidence.push({ text: truncate(sentence), location });
      }
    }
  }

  const softMatch = position.softCompetencies.find(
    (competency) => normalize(competency) === normalize(CRITERIA[signal.criterionId].name),
  );
  if (softMatch) {
    score += 3;
    evidence.push({ text: softMatch, location: 'Wymagane kompetencje miękkie' });
  }

  return { signal, score, evidence: evidence.slice(0, 3) };
}

function confidenceFor(score: number): Confidence {
  if (score >= 7) return 'wysoka';
  if (score >= 3) return 'srednia';
  return 'niska';
}

export function recommendVariant(position: Position): { variant: FormVariant; rationale: string } {
  const manages = position.subordinates.range !== 'brak';
  return manages
    ? {
        variant: 'B',
        rationale:
          'OSP wskazuje, że praca na stanowisku polega na bezpośrednim kierowaniu pracownikami — właściwy jest arkusz B.',
      }
    : {
        variant: 'C',
        rationale:
          'OSP wskazuje brak podległych pracowników i stanowisko nie jest stanowiskiem kierownika urzędu — właściwy jest arkusz C.',
      };
}

export function analyzePosition(position: Position, analyzedAt: IsoDateTime): PositionAnalysis {
  const { variant, rationale } = recommendVariant(position);
  const mandatory = new Set<CriterionId>(MANDATORY_CRITERIA[variant]);

  const suggestions: AdditionalCriterionSuggestion[] = SIGNALS.filter((signal) => !mandatory.has(signal.criterionId))
    .map((signal) => scoreSignal(position, signal))
    .filter((scored) => scored.score > 0 && scored.evidence.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((scored) => ({
      criterionId: scored.signal.criterionId,
      confidence: confidenceFor(scored.score),
      rationale: scored.signal.rationale,
      evidence: scored.evidence,
    }));

  const warnings: string[] = [];
  const unmatchedSoft = position.softCompetencies.filter(
    (competency) =>
      !Object.values(CRITERIA).some((criterion) => normalize(criterion.name) === normalize(competency)),
  );
  if (unmatchedSoft.length > 0) {
    warnings.push(`Nie rozpoznano kompetencji z OSP: ${unmatchedSoft.join(', ')}.`);
  }
  if (!position.fromOrganizer) {
    warnings.push('Opis stanowiska jest danymi demonstracyjnymi przygotowanymi na wzór OSP organizatora.');
  }

  return {
    analyzedAt,
    model: ANALYZER_MODEL,
    recommendedVariant: variant,
    variantRationale: rationale,
    variantEvidence: [
      { text: position.subordinates.quote, location: 'Liczba podległych pracowników' },
      {
        text: `Stanowisko bezpośrednio nadzorujące: ${position.supervisedBy.direct}`,
        location: 'Miejsce stanowiska w strukturze',
      },
    ],
    legalBasis: variant === 'B' ? '§ 3 ust. 3 i § 4 ust. 2 rozporządzenia z 2016 r.' : '§ 3 ust. 4 i § 4 ust. 3 rozporządzenia z 2016 r.',
    suggestions,
    warnings,
  };
}
