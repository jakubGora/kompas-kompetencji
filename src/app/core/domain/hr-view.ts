import type { HistoryEvent } from './assessment.model';

const SHEET_OVERRIDE = 'Zatwierdzono inny arkusz niż wynika z opisu stanowiska.';
const SCORE_DEVIATION = 'Ocena cząstkowa inna niż sugestia narzędzia. Uzasadnienie zostaje u oceniającego.';

/**
 * Kadry widzą przebieg, nie materiał roboczy. Tytuł obserwacji i dopisek o sugestii
 * znikają. Ta sama funkcja jest idempotentna — można ją nałożyć na odpowiedź API.
 */
export function historySummaryForHr(event: HistoryEvent): string {
  const summary = event.summary;
  if (event.kind === 'obserwacja') {
    if (summary === 'Dodano obserwację.' || summary === 'Usunięto obserwację.') return summary;
    return summary.startsWith('Usunięto') ? 'Usunięto obserwację.' : 'Dodano obserwację.';
  }
  if (event.kind === 'odstepstwo') {
    if (summary === SHEET_OVERRIDE || summary === SCORE_DEVIATION) return summary;
    return summary.includes('wbrew rekomendacji') ? SHEET_OVERRIDE : SCORE_DEVIATION;
  }
  if (event.kind === 'decyzja' && /sugest/i.test(summary)) {
    const score = summary.match(/(\d+)\s*pkt/);
    return score ? `Zapisano ocenę cząstkową ${score[1]} pkt.` : 'Zapisano ocenę cząstkową.';
  }
  return summary;
}
