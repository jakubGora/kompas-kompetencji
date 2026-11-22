import type { AppUser, Employee, OrgUnit } from '@core/domain/people.model';

/** Wszystkie dane osobowe są fikcyjne. */

export const ORG_UNITS: readonly OrgUnit[] = [
  { id: 'mc', code: 'MC', name: 'Ministerstwo Cyfryzacji', kind: 'urzad' },
  { id: 'dc', code: 'DC', name: 'Departament Cyberbezpieczeństwa', kind: 'departament', parentId: 'mc' },
  {
    id: 'dc-wzksoic',
    code: 'DC WZKSOiC',
    name: 'Wydział Zarządzania Kryzysowego, Spraw Obronnych i Cyberbezpieczeństwa',
    kind: 'wydzial',
    parentId: 'dc',
  },
  {
    id: 'dsi',
    code: 'DSI',
    name: 'Departament Rozwoju i Bezpieczeństwa Sztucznej Inteligencji',
    kind: 'departament',
    parentId: 'mc',
  },
  { id: 'dsi-wwi', code: 'DSI WWI', name: 'Wydział Wspierania Innowacyjności', kind: 'wydzial', parentId: 'dsi' },
  { id: 'dwm', code: 'DWM', name: 'Departament Współpracy Międzynarodowej', kind: 'departament', parentId: 'mc' },
  {
    id: 'dwm-wkam',
    code: 'DWM WKAM',
    name: 'Wydział Koordynacji Aktywności Międzynarodowych',
    kind: 'wydzial',
    parentId: 'dwm',
  },
  { id: 'bdg', code: 'BDG', name: 'Biuro Dyrektora Generalnego', kind: 'biuro', parentId: 'mc' },
  { id: 'bdg-wk', code: 'BDG WK', name: 'Wydział Kadr', kind: 'wydzial', parentId: 'bdg' },
  { id: 'bdg-wop', code: 'BDG WOP', name: 'Wydział Organizacji Pracy', kind: 'wydzial', parentId: 'bdg' },
];

/** Hasła tylko w seedzie demo (udostępniane jury) — nie trafiają do odpowiedzi API. */
export interface SeedUser extends AppUser {
  readonly login: string;
  readonly password: string;
}

export const USERS: readonly SeedUser[] = [
  {
    id: 'u-piotr',
    fullName: 'Piotr Zieliński',
    jobTitle: 'Naczelnik wydziału',
    orgUnitId: 'dc-wzksoic',
    roles: ['manager'],
    email: 'piotr.zielinski@kompas.demo',
    avatarUrl: '/avatars/piotr-zielinski.png',
    login: 'piotr',
    password: 'piotr',
  },
  {
    id: 'u-marta',
    fullName: 'Marta Wiśniewska',
    jobTitle: 'Główny specjalista ds. kadr',
    orgUnitId: 'bdg-wk',
    roles: ['hr'],
    email: 'marta.wisniewska@kompas.demo',
    login: 'marta',
    password: 'marta',
  },
];

export function publicUser(user: SeedUser | AppUser): AppUser & { login?: string } {
  const { id, fullName, jobTitle, orgUnitId, roles, email, avatarUrl } = user;
  const login = 'login' in user ? user.login : undefined;
  return {
    id,
    fullName,
    jobTitle,
    orgUnitId,
    roles,
    email,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(login ? { login } : {}),
  };
}

export const EMPLOYEES: readonly Employee[] = [
  {
    id: 'e-anna',
    firstName: 'Anna',
    lastName: 'Nowak',
    fullName: 'Anna Nowak',
    positionId: 'pos-dc-wzksoic-6',
    orgUnitId: 'dc-wzksoic',
    supervisorId: 'u-piotr',
    status: 'pracownik-sc',
    employment: { since: '2019-03-01', basis: 'czas-nieokreslony' },
    absences: [{ from: '2025-04-07', to: '2025-05-18', reason: 'Zwolnienie lekarskie' }],
    previousAssessment: {
      draftedAt: '2024-10-10',
      acknowledgedAt: '2024-10-14',
      outcome: 'pozytywna',
      level: 'na-poziomie',
    },
  },
  {
    id: 'e-ewa-jankowska',
    firstName: 'Ewa',
    lastName: 'Jankowska',
    fullName: 'Ewa Jankowska',
    positionId: 'pos-dc-wzksoic-8',
    orgUnitId: 'dc-wzksoic',
    supervisorId: 'u-piotr',
    status: 'pracownik-sc',
    employment: { since: '2018-06-01', basis: 'czas-nieokreslony' },
    absences: [],
    previousAssessment: {
      draftedAt: '2026-11-06',
      acknowledgedAt: '2026-11-09',
      outcome: 'pozytywna',
      level: 'powyzej',
    },
  },
  {
    id: 'e-michal',
    firstName: 'Michał',
    lastName: 'Kamiński',
    fullName: 'Michał Kamiński',
    positionId: 'pos-dc-wzksoic-4',
    orgUnitId: 'dc-wzksoic',
    supervisorId: 'u-piotr',
    status: 'pracownik-sc',
    employment: { since: '2021-02-01', basis: 'czas-nieokreslony' },
    absences: [],
    previousAssessment: {
      draftedAt: '2024-12-15',
      acknowledgedAt: '2024-12-18',
      outcome: 'pozytywna',
      level: 'na-poziomie',
    },
  },
  {
    id: 'e-marek',
    firstName: 'Marek',
    lastName: 'Wysocki',
    fullName: 'Marek Wysocki',
    positionId: 'pos-dc-wzksoic-3',
    orgUnitId: 'dc-wzksoic',
    supervisorId: 'u-piotr',
    status: 'urzednik-sc',
    employment: { since: '2014-09-01', basis: 'czas-nieokreslony' },
    absences: [],
    previousAssessment: {
      draftedAt: '2026-11-12',
      acknowledgedAt: '2026-11-13',
      outcome: 'pozytywna',
      level: 'znacznie-powyzej',
    },
    civilServant: { appointedYear: 2017, grade: 'drugi', gradeGrantedAt: '2021-12-01' },
  },
  {
    id: 'e-zofia',
    firstName: 'Zofia',
    lastName: 'Krawczyk',
    fullName: 'Zofia Krawczyk',
    positionId: 'pos-dc-wzksoic-9',
    orgUnitId: 'dc-wzksoic',
    supervisorId: 'u-piotr',
    status: 'pracownik-sc',
    employment: { since: '2026-03-02', basis: 'pierwsza-umowa', firstContractEnd: '2027-03-01' },
    absences: [],
  },
];
