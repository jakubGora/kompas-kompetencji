import {
  firstAssessmentWindows,
  nextAssessmentDueDate,
  objectionDeadline,
  periodicDueDate,
  preliminaryMeetingDueDate,
  qualifyingAbsences,
} from './deadlines';

describe('deadlines', () => {
  it('przedłuża termin o nieobecność dłuższą niż miesiąc (przykład z poradnika: 41 dni)', () => {
    const [absence] = qualifyingAbsences([{ from: '2014-09-09', to: '2014-10-19', reason: 'urlop i L4' }]);
    expect(absence.days).toBe(41);
  });

  it('pomija nieobecność nie dłuższą niż miesiąc', () => {
    expect(qualifyingAbsences([{ from: '2025-07-01', to: '2025-07-31', reason: 'urlop' }])).toEqual([]);
  });

  it('wyznacza termin Anny Nowak: 10.10.2024 + 24 mies. + 42 dni = 21.11.2026', () => {
    const due = periodicDueDate('2024-10-10', [{ from: '2025-04-07', to: '2025-05-18', reason: 'zwolnienie lekarskie' }]);
    expect(due.baseDueDate).toBe('2026-10-10');
    expect(due.extensionDays).toBe(42);
    expect(due.dueDate).toBe('2026-11-21');
  });

  it('wyznacza termin zapoznania z kryteriami (30 dni; 7 dni po ocenie negatywnej)', () => {
    expect(preliminaryMeetingDueDate('2015-09-04')).toBe('2015-10-04');
    expect(preliminaryMeetingDueDate('2026-11-21', 'negatywna')).toBe('2026-11-28');
  });

  it('wyznacza kolejną ocenę i termin sprzeciwu', () => {
    expect(nextAssessmentDueDate('pozytywna', '2026-11-21', '2026-11-21')).toBe('2028-11-21');
    expect(nextAssessmentDueDate('negatywna', '2026-11-21', '2026-11-21')).toBe('2027-05-21');
    expect(objectionDeadline('2026-11-21')).toBe('2026-11-28');
  });

  it('wyznacza okna pierwszej oceny', () => {
    const windows = firstAssessmentWindows('2026-03-02', '2027-03-01');
    expect(windows.preliminaryDueDate).toBe('2026-03-23');
    expect(windows.earliestReportDate).toBe('2026-11-02');
    expect(windows.assessmentDeadline).toBe('2027-02-01');
  });
});
