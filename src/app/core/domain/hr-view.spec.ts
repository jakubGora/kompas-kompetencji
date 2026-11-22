import type { HistoryEvent } from './assessment.model';
import { historySummaryForHr } from './hr-view';

function event(kind: HistoryEvent['kind'], summary: string): HistoryEvent {
  return { id: 'h1', at: '2026-11-01T10:00:00.000Z', actor: { id: 'u', fullName: 'A', jobTitle: 'B' }, kind, summary };
}

describe('historySummaryForHr', () => {
  it('zdejmuje tytuł obserwacji i dopisek o sugestii', () => {
    expect(historySummaryForHr(event('obserwacja', 'Dodano obserwację: Incydent na dyżurze.'))).toBe('Dodano obserwację.');
    expect(historySummaryForHr(event('obserwacja', 'Usunięto obserwację „Incydent”.'))).toBe('Usunięto obserwację.');
    expect(historySummaryForHr(event('odstepstwo', 'Zatwierdzono arkusz B wbrew rekomendacji (C): bo tak'))).toBe(
      'Zatwierdzono inny arkusz niż wynika z opisu stanowiska.',
    );
    expect(historySummaryForHr(event('odstepstwo', 'Komunikacja: 7 pkt — odstępstwo od sugestii narzędzia (5 pkt).'))).toBe(
      'Ocena cząstkowa inna niż sugestia narzędzia. Uzasadnienie zostaje u oceniającego.',
    );
    expect(historySummaryForHr(event('decyzja', 'Ocena cząstkowa 5 pkt (c1) zgodna z sugestią.'))).toBe(
      'Zapisano ocenę cząstkową 5 pkt.',
    );
    expect(historySummaryForHr(event('krok', 'Zakończono krok.'))).toBe('Zakończono krok.');
  });

  it('nie zmienia tekstu, który jest już zredagowany', () => {
    const samples = [
      event('obserwacja', 'Dodano obserwację.'),
      event('odstepstwo', 'Zatwierdzono inny arkusz niż wynika z opisu stanowiska.'),
      event('odstepstwo', 'Ocena cząstkowa inna niż sugestia narzędzia. Uzasadnienie zostaje u oceniającego.'),
      event('decyzja', 'Zapisano ocenę cząstkową 5 pkt.'),
    ];
    for (const item of samples) {
      expect(historySummaryForHr(item)).toBe(item.summary);
    }
  });
});
