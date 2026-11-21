import type { IndicatorMatch, ObservationAnalysis, ObservationCoaching } from '@core/domain/assistant.model';
import type { CriterionId } from '@core/domain/criteria';
import type { IsoDateTime } from '@core/domain/date';
import type { PositionTask } from '@core/domain/position.model';
import { collapseWhitespace, matchStems, normalize } from './text';

export interface ObservationDraft {
  readonly date?: string;
  readonly title?: string;
  /** „Zadanie i zachowanie” — jeden opis sytuacji, zachowania i rezultatu. */
  readonly description?: string;
}

/** Rdzenie słów wskazujące na wskaźniki modelu. Dobór jest heurystyką mocka — docelowo model językowy. */
const INDICATOR_STEMS: Readonly<Record<string, readonly string[]>> = {
  'c01-i01': ['procedur', 'standard', 'zgodnie z', 'jakosc', 'poprawn', 'bled', 'dokladn', 'rzeteln'],
  'c01-i02': ['termin', 'w czasie', 'opozni', 'harmonogram', 'na czas', 'zobowiaz'],
  'c02-i01': ['wysluch', 'dopytal', 'upewnil', 'zrozumieni', 'sluchal'],
  'c02-i02': ['wyjasnil', 'przedstawil', 'omowil', 'ustnie', 'spotkani'],
  'c02-i03': ['pism', 'notatk', 'komunikat', 'raport', 'e-mail', 'mail', 'liste ustalen', 'lista ustalen'],
  'c02-i04': ['argument', 'przekonal', 'uzasadnil', 'rekomend'],
  'c03-i01': ['wiedz', 'przepis', 'ustaw', 'znajomosc', 'ekspert'],
  'c03-i02': ['szkoleni', 'kurs', 'nauczyl', 'doskonal', 'certyfikat', 'aktualizacj'],
  'c03-i03': ['zrodl', 'narzedzi', 'system', 'baz', 'dane z', 'technologi'],
  'c04-i01': ['plan', 'harmonogram', 'kamieni', 'rozpisal', 'sposob realizacji'],
  'c04-i02': ['priorytet', 'pilne', 'kolejnosc', 'wazn'],
  'c04-i03': ['zasob', 'wlascicieli', 'przypisal', 'podzial', 'odpowiedzialn'],
  'c04-i04': ['zmian', 'dostosow', 'elastyczn', 'nieprzewidzian'],
  'c04-i05': ['zaangazow', 'wytrwal', 'mimo', 'doprowadzil', 'dokonczyl'],
  'c05-i01': ['zaproponowal', 'nowe rozwiazani', 'usprawnieni', 'pomysl', 'wariant'],
  'c05-i02': ['nietypow', 'niestandardow', 'inaczej', 'kreatywn'],
  'c06-i01': ['wlaczyl', 'wspolnie', 'razem', 'pomogl', 'wsparl', 'zespol'],
  'c06-i02': ['przekazal', 'rozeslal', 'poinformowal', 'liste ustalen', 'lista ustalen', 'przeplyw', 'uzgodni'],
  'c06-i03': ['atmosfer', 'otwart', 'zyczliw'],
  'c06-i04': ['docenil', 'podziekowal', 'wklad'],
  'c06-i05': ['uwzglednil', 'opinie', 'zdanie', 'konsultowal'],
  'c06-i06': ['podzielil', 'wskazowki', 'przeszkolil', 'instrukcj', 'omowienie'],
  'c07-i01': ['istotn', 'kluczow', 'rozroz', 'wyselekcjon'],
  'c07-i02': ['zaleznosc', 'rozbieznos', 'zestawil', 'porownal', 'przyczyn'],
  'c07-i03': ['wniosk', 'rekomendacj', 'zidentyfikowal', 'ocenil'],
  'c08-i01': ['stanowisko negocjacyjn', 'ustepstw', 'mandat'],
  'c08-i02': ['negocj', 'kompromis'],
  'c08-i03': ['porozumieni', 'uzgodnil z'],
  'c09-i01': ['prezentacj', 'slajd', 'multimedi'],
  'c09-i02': ['audytori', 'uczestnik', 'sala'],
  'c09-i03': ['czas wystapienia', 'ramy czasowe', 'zmiescil sie'],
  'c09-i04': ['trudne pytani', 'krytyk', 'stres'],
  'c10-i01': ['takt', 'szacun', 'uprzejm'],
  'c10-i02': ['potrzeb', 'klient', 'interesant', 'wnioskodawc'],
  'c11-i01': ['incydent', 'kryzys', 'alarm', 'powiadomil', 'eskalac', 'dyzurn', 'rcb', 'zglosil'],
  'c11-i02': ['reagow', 'opanowal', 'dzialania naprawcze', 'zabezpiecz', 'ograniczyl skutki'],
  'c11-i03': ['wnioski z incydent', 'po incydencie', 'lessons learned', 'poprawi procedur', 'szablon komunikatu'],
  'c12-i01': ['wizj', 'cele strategiczne', 'strategi'],
  'c12-i02': ['cele operacyjne', 'plan dzialan'],
  'c12-i03': ['analiza ryzyka', 'ryzyko strategiczne'],
  'c13-i01': ['delegowal', 'przydzielil'],
  'c13-i02': ['monitorowal', 'korygujac', 'nadzorowal'],
  'c13-i03': ['motywow', 'zaangazowal zespol'],
  'c13-i04': ['informacje zwrotna', 'informacji zwrotnej', 'feedback'],
  'c13-i05': ['konflikt', 'spor'],
  'c13-i06': ['rozwoj pracownik', 'potrzeby rozwojowe', 'mentoring'],
  'c14-i01': ['warianty', 'alternatyw', 'ryzyk', 'opcj'],
  'c14-i02': ['zdecydowal', 'decyzj', 'wybral'],
  'c14-i03': ['odpowiedzialnosc', 'wziela na siebie', 'wzial na siebie', 'przyjela odpowiedzialnosc'],
};

/** Wyrażenia sygnalizujące opinię lub ocenę cech osoby zamiast opisu zachowania (tekst bez polskich znaków). */
const OPINION_PATTERNS: readonly RegExp[] = [
  /\bslabo\b/,
  /\bzle\b/,
  /\bzawsze\b/,
  /\bnigdy\b/,
  /\bleniw\w*/,
  /\bnie potrafi\b/,
  /\bnie umie\b/,
  /\bswietn\w*/,
  /\bbeznadziej\w*/,
  /\bnie nadaje\b/,
  /\bkonfliktow\w*/,
  /\bmalo zaangazowan\w*/,
  /\bkiepsk\w*/,
  /\bciagle\b/,
  /\bnieodpowiedzialn\w*/,
  /\barogan\w*/,
  /\bemocjonaln\w*/,
  /\bcharakter\w*/,
  /\bosobowos\w*/,
];

function foldDiacritics(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l');
}

/** Zwraca oryginalne brzmienie znalezionych określeń (z polskimi znakami). */
export function findOpinionPhrases(text: string): string[] {
  const original = text.normalize('NFC');
  const folded = foldDiacritics(original);
  const found = new Set<string>();
  for (const pattern of OPINION_PATTERNS) {
    const match = pattern.exec(folded);
    if (match) {
      found.add(original.slice(match.index, match.index + match[0].length));
    }
  }
  return [...found];
}

const MIN_BEHAVIOR_LENGTH = 25;

/** Sygnały, że opis zawiera skutek zachowania (tekst znormalizowany). Heurystyka mocka. */
const RESULT_STEMS: readonly string[] = [
  'w terminie',
  'w efekcie',
  'dzieki',
  'skutk',
  'rezultat',
  'przyjeto',
  'przyjal',
  'zaakcept',
  'zakonczon',
  'udalo',
  'jednak',
  'bez uwag',
  'wczesniej',
  'opozni',
  'liste ustalen',
  'warianty',
];

function hasResult(description: string): boolean {
  return matchStems(description, RESULT_STEMS).length > 0 || /[;,]/.test(description);
}

export function coachObservation(draft: ObservationDraft): ObservationCoaching {
  const description = collapseWhitespace(draft.description ?? '');
  const flaggedPhrases = findOpinionPhrases([draft.title, description].filter(Boolean).join(' '));

  const missing: ObservationCoaching['missing'][number][] = [];
  if (!draft.date) missing.push('data');
  if (description.length < MIN_BEHAVIOR_LENGTH) missing.push('zachowanie');
  else if (!hasResult(description)) missing.push('rezultat');

  const questions: string[] = [];
  if (missing.includes('data')) questions.push('Kiedy dokładnie to było? Podaj datę albo przybliżony tydzień.');
  if (missing.includes('zachowanie'))
    questions.push('Co konkretnie zrobił(a) pracownik i przy jakim zadaniu? Opisz zachowanie, które można było zobaczyć lub usłyszeć.');
  if (missing.includes('rezultat')) questions.push('Jaki był skutek dla zadania, terminu, zespołu lub odbiorcy?');
  for (const phrase of flaggedPhrases.slice(0, 2)) {
    questions.push(`Zamiast „${phrase}” opisz zachowanie: co dokładnie zostało powiedziane lub zrobione?`);
  }

  if (flaggedPhrases.length > 0 && missing.length > 0) {
    return {
      quality: 'ocena-zamiast-faktu',
      message:
        'To raczej ocena niż obserwacja. Opisz konkretną sytuację: kiedy to było, co zrobił(a) pracownik i jaki był skutek. Opinia bez faktu nie powinna podnosić ani obniżać oceny.',
      missing,
      flaggedPhrases,
      questions,
    };
  }
  if (missing.length > 0 || flaggedPhrases.length > 0) {
    return {
      quality: 'do-uzupelnienia',
      message:
        flaggedPhrases.length > 0
          ? 'Notatka zawiera określenia oceniające. Zostaw fakty — zachowanie i jego skutek.'
          : 'Uzupełnij notatkę, żeby była konkretnym przykładem: zadanie, zachowanie i jego rezultat.',
      missing,
      flaggedPhrases,
      questions,
    };
  }
  return {
    quality: 'konkretna',
    message: 'Notatka opisuje zachowanie i jego rezultat — nadaje się jako przykład do oceny.',
    missing,
    flaggedPhrases,
    questions: [],
  };
}

const TITLE_LIMIT = 60;
const TITLE_MIN = 15;
const TRAILING_WORD = /^(?:i|oraz|a|w|z|na|do|o|od|po|przy|dla)$/iu;

/** Pierwszy człon opisu (do spójnika lub znaku interpunkcyjnego) — szkic tytułu do zatwierdzenia. */
export function suggestTitle(description: string): string {
  const sentence = collapseWhitespace(description).split(/[.;:!?,]/u)[0]?.trim() ?? '';
  const clause = sentence.split(/\s(?:i|oraz|a|ale|lecz)\s/u)[0] ?? sentence;
  const base = clause.length >= TITLE_MIN ? clause : sentence;
  const words = base.length <= TITLE_LIMIT ? base.split(' ') : base.slice(0, TITLE_LIMIT + 1).split(' ').slice(0, -1);
  while (words.length > 1 && TRAILING_WORD.test(words.at(-1) ?? '')) words.pop();
  const title = words.join(' ');
  return title.charAt(0).toLocaleUpperCase('pl') + title.slice(1);
}

/** Zadanie z OSP o największej liczbie wspólnych rdzeni słów z opisem (co najmniej dwa). */
export function suggestTask(description: string, tasks: readonly PositionTask[]): string | undefined {
  const haystack = normalize(description);
  const scored = tasks
    .map((task) => {
      const stems = new Set(
        normalize(task.text)
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length >= 6)
          .map((word) => word.slice(0, 6)),
      );
      return { id: task.id, hits: [...stems].filter((stem) => haystack.includes(stem)).length };
    })
    .filter((entry) => entry.hits >= 2)
    .sort((a, b) => b.hits - a.hits);
  return scored[0]?.id;
}

export function matchIndicators(draft: ObservationDraft, criteria: readonly CriterionId[]): IndicatorMatch[] {
  const text = [draft.title, draft.description].filter(Boolean).join(' ');
  const allowed = new Set<string>(criteria);
  return Object.entries(INDICATOR_STEMS)
    .filter(([indicatorId]) => allowed.has(indicatorId.slice(0, 3)))
    .map(([indicatorId, stems]) => ({ indicatorId, hits: matchStems(text, stems) }))
    .filter((entry) => entry.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, 4)
    .map((entry) => ({
      criterionId: entry.indicatorId.slice(0, 3) as CriterionId,
      indicatorId: entry.indicatorId,
      confidence: entry.hits.length >= 3 ? 'wysoka' : entry.hits.length === 2 ? 'srednia' : 'niska',
      matchedPhrases: entry.hits,
    }));
}

export function analyzeObservation(
  draft: ObservationDraft,
  criteria: readonly CriterionId[],
  tasks: readonly PositionTask[],
  analyzedAt: IsoDateTime,
): ObservationAnalysis {
  const description = draft.description ?? '';
  const taskId = suggestTask(description, tasks);
  return {
    coaching: coachObservation(draft),
    matches: matchIndicators(draft, criteria),
    suggestedTitle: draft.title?.trim() || suggestTitle(description),
    ...(taskId ? { suggestedTaskId: taskId } : {}),
    analyzedAt,
  };
}
