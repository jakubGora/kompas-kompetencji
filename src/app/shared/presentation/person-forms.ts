/** Imiona męskie zakończone na „-a” — wyjątki od rozpoznawania rodzaju po końcówce imienia. */
const MASCULINE_NAMES_ENDING_IN_A = new Set(['barnaba', 'bonawentura', 'dyzma', 'jarema', 'kosma', 'kuba', 'zawisza']);

export function isFeminineName(firstName: string): boolean {
  const name = firstName.trim().toLocaleLowerCase('pl-PL');
  return name.endsWith('a') && !MASCULINE_NAMES_ENDING_IN_A.has(name);
}

/** Odmiana „pracownik/pracownica” do komunikatów o ocenianej osobie. */
export interface EmployeeNoun {
  /** pracownica / pracownik */
  readonly nominative: string;
  /** (dla) pracownicy / pracownika */
  readonly genitive: string;
  /** (z) pracownicą / pracownikiem */
  readonly instrumental: string;
}

const FEMININE: EmployeeNoun = { nominative: 'pracownica', genitive: 'pracownicy', instrumental: 'pracownicą' };
const MASCULINE: EmployeeNoun = { nominative: 'pracownik', genitive: 'pracownika', instrumental: 'pracownikiem' };

export function employeeNoun(firstName: string): EmployeeNoun {
  return isFeminineName(firstName) ? FEMININE : MASCULINE;
}
