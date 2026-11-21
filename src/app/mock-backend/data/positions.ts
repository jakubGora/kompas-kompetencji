import type { Position, PositionTask } from '@core/domain/position.model';

function tasks(prefix: string, dominant: readonly string[], other: readonly string[]): PositionTask[] {
  return [
    ...dominant.map((text, index) => ({ id: `${prefix}-t${index + 1}`, no: index + 1, kind: 'dominujace' as const, text })),
    ...other.map((text, index) => ({
      id: `${prefix}-t${dominant.length + index + 1}`,
      no: dominant.length + index + 1,
      kind: 'pozostale' as const,
      text,
    })),
  ];
}

const DC_TASKS_DOMINANT = [
  'Bierze udział w opracowaniu i aktualizacji dokumentacji w zakresie zarządzania kryzysowego (np. Krajowego planu reagowania na incydenty i sytuacje kryzysowe w cyberbezpieczeństwie na dużą skalę) w celu zapewnienia obsługi zadań Ministra w zakresie zarządzania kryzysowego w cyberprzestrzeni.',
  'Bierze udział w realizacji zadań z obszaru zarządzania kryzysowego wynikających z członkostwa Polski w Organizacji Paktu Północnoatlantyckiego (NATO), Unii Europejskiej (UE) i Organizacji Narodów Zjednoczonych (ONZ) w celu zapewnienia stałej gotowości do reagowania na zagrożenia płynące z cyberprzestrzeni.',
  'Współpracuje z zespołami CSIRT i organami właściwymi do spraw cyberbezpieczeństwa w celu wzmocnienia krajowego systemu cyberbezpieczeństwa.',
];

const DC_TASKS_OTHER = [
  'Bierze udział w wykonywaniu działań zmierzających do integracji krajowego systemu cyberbezpieczeństwa z krajowym systemem zarządzania kryzysowego poprzez unifikację procedur oraz czynności kontrolnych w celu zwiększenia odporności tych systemów.',
  'Bierze udział w wykonywaniu zadań w ramach Krajowych ram zarządzania kryzysowego w cyberbezpieczeństwie w celu zwiększenia odporności systemu zarządzania kryzysowego, koordynacji działań między organami publicznymi a sektorem prywatnym oraz szybszego reagowania na zagrożenia.',
  'Dokonuje oceny obiektów oraz procesów pod kątem Infrastruktury krytycznej w celu prowadzenia wykazu obiektów IK będących we właściwości Ministra Cyfryzacji oraz zwiększenia odporności Państwa na kryzysy.',
  'Wykonuje zadania organu właściwego ds. podmiotów krytycznych (m.in. prowadzenie kontroli, aktualizacja dokumentacji) w celu zwiększenia odporności Państwa na kryzysy.',
];

const DC_INDEPENDENCE =
  'Osoba na tym stanowisku otrzymuje od przełożonego polecenia i informacje dotyczące celu pracy, jednak realizuje zadania samodzielnie, dokonując wyboru sposobu ich wykonania. W pracy mogą pojawić się okoliczności wymagające decyzji uznaniowych w zakresie uzgodnionym z przełożonym. Na podstawie analiz formułuje opinie i uzasadnia proponowane sposoby działania, co wpływa na decyzje podejmowane przez przełożonych. Samodzielne podejmowanie decyzji jest niezbędne na forum międzynarodowym (w ramach udzielonej instrukcji) oraz w czasie sytuacji kryzysowych.';

const DC_DEPARTMENT = 'Departament Cyberbezpieczeństwa';
const DC_DIVISION = 'Wydział Zarządzania Kryzysowego, Spraw Obronnych i Cyberbezpieczeństwa';

export const POSITIONS: readonly Position[] = [
  {
    id: 'pos-dc-wzksoic-6',
    code: 'DC WZKSOiC 6',
    title: 'Starszy specjalista',
    orgUnitId: 'dc-wzksoic',
    office: 'Ministerstwo Cyfryzacji',
    department: DC_DEPARTMENT,
    division: DC_DIVISION,
    documentName: 'OSP DC WZKSOiC 6 starszy specjalista.docx',
    fromOrganizer: true,
    purpose:
      'Prowadzenie spraw dotyczących zarządzania kryzysowego w cyberprzestrzeni pozostających w zakresie ministra właściwego ds. informatyzacji.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks('dc6', DC_TASKS_DOMINANT, DC_TASKS_OTHER),
    authorizations: [
      'upoważnienie do przeprowadzania kontroli',
      'upoważnienie do reprezentowania RP w pracach grup tematycznych UE, w zakresie wynikającym z powierzonych zadań',
    ],
    independence: DC_INDEPENDENCE,
    softCompetencies: [
      'organizacja pracy i orientacja na osiąganie celów',
      'współpraca',
      'myślenie analityczne',
      'wykorzystywanie wiedzy i doskonalenie zawodowe',
    ],
  },
  {
    id: 'pos-dc-wzksoic-8',
    code: 'DC WZKSOiC 8',
    title: 'Starszy specjalista',
    orgUnitId: 'dc-wzksoic',
    office: 'Ministerstwo Cyfryzacji',
    department: DC_DEPARTMENT,
    division: DC_DIVISION,
    documentName: 'OSP DC WZKSOiC 8 starszy specjalista.docx',
    fromOrganizer: false,
    purpose:
      'Prowadzenie spraw dotyczących zarządzania kryzysowego w cyberprzestrzeni pozostających w zakresie ministra właściwego ds. informatyzacji.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks('dc8', DC_TASKS_DOMINANT, DC_TASKS_OTHER),
    authorizations: [
      'upoważnienie do przeprowadzania kontroli',
      'upoważnienie do reprezentowania RP w pracach grup tematycznych UE, w zakresie wynikającym z powierzonych zadań',
    ],
    independence: DC_INDEPENDENCE,
    softCompetencies: [
      'organizacja pracy i orientacja na osiąganie celów',
      'współpraca',
      'myślenie analityczne',
      'wykorzystywanie wiedzy i doskonalenie zawodowe',
    ],
  },
  {
    id: 'pos-dc-wzksoic-4',
    code: 'DC WZKSOiC 4',
    title: 'Specjalista',
    orgUnitId: 'dc-wzksoic',
    office: 'Ministerstwo Cyfryzacji',
    department: DC_DEPARTMENT,
    division: DC_DIVISION,
    documentName: 'OSP DC WZKSOiC 4 specjalista.docx',
    fromOrganizer: false,
    purpose:
      'Obsługa zgłoszeń i dokumentacji krajowego systemu cyberbezpieczeństwa w zakresie właściwości wydziału.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks(
      'dc4',
      [
        'Prowadzi rejestr zgłoszeń i informacji o incydentach przekazywanych przez zespoły CSIRT w celu zapewnienia aktualnego obrazu sytuacji w cyberprzestrzeni.',
        'Przygotowuje projekty pism, notatek i informacji dla kierownictwa w sprawach z zakresu wydziału w celu sprawnej komunikacji wewnętrznej i zewnętrznej.',
        'Bierze udział w przygotowaniu ćwiczeń z zakresu zarządzania kryzysowego w celu sprawdzenia procedur reagowania.',
      ],
      [
        'Aktualizuje wykazy kontaktów i procedury obiegu informacji w sytuacjach kryzysowych.',
        'Udziela odpowiedzi na zapytania podmiotów publicznych dotyczące obowiązków wynikających z ustawy o krajowym systemie cyberbezpieczeństwa.',
      ],
    ),
    authorizations: [],
    independence:
      'Realizuje zadania według wskazówek przełożonego, samodzielnie dobierając sposób ich wykonania w ramach obowiązujących procedur. W sytuacjach nietypowych konsultuje się z przełożonym.',
    softCompetencies: ['rzetelność', 'komunikacja', 'współpraca'],
  },
  {
    id: 'pos-dc-wzksoic-3',
    code: 'DC WZKSOiC 3',
    title: 'Główny specjalista',
    orgUnitId: 'dc-wzksoic',
    office: 'Ministerstwo Cyfryzacji',
    department: DC_DEPARTMENT,
    division: DC_DIVISION,
    documentName: 'OSP DC WZKSOiC 3 główny specjalista.docx',
    fromOrganizer: false,
    purpose: 'Koordynacja ćwiczeń i szkoleń z zarządzania kryzysowego w cyberprzestrzeni.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks(
      'dc3',
      [
        'Planuje i koordynuje udział Ministerstwa w krajowych i międzynarodowych ćwiczeniach z zarządzania kryzysowego w cyberprzestrzeni w celu sprawdzenia gotowości do reagowania.',
        'Opracowuje scenariusze ćwiczeń oraz raporty z wnioskami i rekomendacjami zmian w procedurach.',
        'Reprezentuje wydział na posiedzeniach grup roboczych i prowadzi uzgodnienia z partnerami krajowymi i zagranicznymi.',
      ],
      [
        'Prowadzi szkolenia i prezentacje dla pracowników administracji z zakresu reagowania na incydenty.',
        'Przygotowuje propozycje nowych rozwiązań organizacyjnych usprawniających współdziałanie w sytuacjach kryzysowych.',
      ],
    ),
    authorizations: ['upoważnienie do reprezentowania urzędu na spotkaniach grup roboczych'],
    independence:
      'Samodzielnie planuje i prowadzi ćwiczenia, podejmując decyzje organizacyjne w ich trakcie. W sytuacjach bezprecedensowych proponuje przełożonemu rozwiązania.',
    softCompetencies: ['organizacja pracy i orientacja na osiąganie celów', 'wystąpienia publiczne', 'negocjowanie'],
  },
  {
    id: 'pos-dc-wzksoic-9',
    code: 'DC WZKSOiC 9',
    title: 'Młodszy specjalista',
    orgUnitId: 'dc-wzksoic',
    office: 'Ministerstwo Cyfryzacji',
    department: DC_DEPARTMENT,
    division: DC_DIVISION,
    documentName: 'OSP DC WZKSOiC 9 młodszy specjalista.docx',
    fromOrganizer: false,
    purpose: 'Wsparcie wydziału w prowadzeniu dokumentacji zarządzania kryzysowego.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks(
      'dc9',
      [
        'Prowadzi ewidencję dokumentacji z zakresu zarządzania kryzysowego w celu zapewnienia jej kompletności i aktualności.',
        'Przygotowuje materiały na posiedzenia zespołów i grup roboczych w celu sprawnej organizacji ich prac.',
      ],
      [
        'Uczestniczy w przygotowaniu ćwiczeń i szkoleń z zakresu zarządzania kryzysowego.',
        'Aktualizuje wykazy kontaktów do podmiotów krajowego systemu cyberbezpieczeństwa.',
      ],
    ),
    authorizations: [],
    independence: 'Wykonuje zadania według szczegółowych wskazówek przełożonego i obowiązujących procedur.',
    softCompetencies: ['rzetelność', 'współpraca'],
  },
  {
    id: 'pos-dsi-wwi-5',
    code: 'DSI WWI 5',
    title: 'Radca',
    orgUnitId: 'dsi-wwi',
    office: 'Ministerstwo Cyfryzacji',
    department: 'Departament Rozwoju i Bezpieczeństwa Sztucznej Inteligencji',
    division: 'Wydział Wspierania Innowacyjności',
    documentName: 'OSP DSI WWI 5 radca.docx',
    fromOrganizer: true,
    purpose:
      'Zapewnienie wsparcia merytorycznego w zakresie rozwoju innowacyjnych rozwiązań opartych na sztucznej inteligencji poprzez rozwijanie mechanizmów wspierających zgodność z przepisami prawa oraz identyfikowanie barier dla rozwoju innowacyjności.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'zastępca dyrektora' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks(
      'dsi5',
      [
        'Analizuje i dokonuje oceny prawa krajowego, prawa Unii Europejskiej, orzecznictwa krajowego i międzynarodowego, wytycznych organów unijnych oraz praktyki stosowania prawa w obszarze sztucznej inteligencji, a także przygotowuje propozycje zmian systemowych.',
        'Prowadzi sprawy dotyczące opinii indywidualnych oraz wyjaśnień dotyczących stosowania przepisów krajowych i unijnych z zakresu sztucznej inteligencji, w celu zapewnienia prawidłowej i jednolitej interpretacji oraz stosowania przepisów w tym obszarze.',
        'Przygotowuje projekty informacji zawierające pogląd Komisji w sprawach sztucznej inteligencji, w celu zapewnienia jednolitego stanowiska Komisji oraz wsparcia prawidłowego stosowania przepisów w obszarze sztucznej inteligencji.',
      ],
      [
        'Analizuje bariery prawne i organizacyjne dla rozwoju innowacji w obszarze sztucznej inteligencji w celu opracowywania propozycji działań usprawniających.',
        'Przygotowuje projekty odpowiedzi na pisma i inne wystąpienia kierowane do Komisji Rozwoju i Bezpieczeństwa Sztucznej Inteligencji w ramach właściwości wydziału, w celu zapewnienia sprawnej, rzetelnej i zgodnej z obowiązującymi przepisami realizacji zadań Komisji oraz właściwej komunikacji z podmiotami zewnętrznymi.',
      ],
    ),
    authorizations: [],
    independence:
      'Pracownik samodzielnie proponuje przełożonym rozwiązania dla sytuacji wymagających dostarczenia wyspecjalizowanej wiedzy, w tym przypadków bezprecedensowych. Osoba na tym stanowisku tworzy nowe koncepcje realizacji zadań. W codziennej pracy spotyka się z koniecznością podejmowania decyzji uznaniowych, co wymaga umiejętności analitycznych. Niezbędna jest umiejętność przedstawiania argumentów oraz przekonywania innych do przyjęcia określonych stanowisk.',
    softCompetencies: [
      'organizacja pracy i orientacja na osiąganie celów',
      'wykorzystywanie wiedzy i doskonalenie zawodowe',
      'współpraca',
    ],
  },
  {
    id: 'pos-dwm-wkam-1',
    code: 'DWM WKAM 1',
    title: 'Naczelnik wydziału',
    orgUnitId: 'dwm-wkam',
    office: 'Ministerstwo Cyfryzacji',
    department: 'Departament Współpracy Międzynarodowej',
    division: 'Wydział Koordynacji Aktywności Międzynarodowych',
    documentName: 'OSP DWM WKAM 1 naczelnik wydziału.docx',
    fromOrganizer: true,
    purpose:
      'Zapewnienie organizacji aktywności członków kierownictwa MC na arenie międzynarodowej, w tym przygotowania i realizacji zagranicznych wizyt członków kierownictwa MC oraz wizyt gości zagranicznych w Polsce; koordynacja obsługi spraw budżetowo-finansowych Departamentu.',
    supervisedBy: { direct: 'zastępca dyrektora', indirect: 'dyrektor' },
    subordinates: {
      range: '5-9',
      quote: '☒ bezpośrednio kieruje lub koordynuje pracę od 5 do 9 pracowników',
    },
    tasks: tasks(
      'dwm1',
      [
        'Koordynuje pracę zespołu poprzez planowanie, organizowanie oraz nadzorowanie realizacji zadań zgodnie z wyznaczonymi celami. Zapewnia skuteczne zarządzanie zespołem poprzez monitorowanie postępów, delegowanie obowiązków oraz dostosowywanie działań do zmieniających się warunków. Podejmuje działania motywacyjne i rozwojowe.',
        'Nadzoruje oraz bierze udział w przygotowaniu i organizacji zagranicznych wizyt członków kierownictwa MC oraz wizyt gości zagranicznych w Polsce, a także spotkań o charakterze międzynarodowym z podmiotami krajowymi.',
        'Koordynuje obsługę spraw finansowo-budżetowych departamentu, w tym udzielanie i rozliczanie dotacji, łącznie z wydawaniem stosownych decyzji administracyjnych oraz przygotowywaniem projektu budżetu.',
      ],
      [
        'Koordynuje przygotowania materiałów tezowo-informacyjnych (stanowiska, opinie) z zakresu dwustronnej lub wielostronnej współpracy z państwami i organizacjami międzynarodowymi w obszarze cyfryzacji.',
        'Organizuje wydarzenia o charakterze międzynarodowym w obszarze cyfryzacji (m.in. konferencje, kongresy, seminaria, warsztaty, konsultacje), a także przygotowuje rekomendacje w zakresie uczestnictwa członków Kierownictwa MC.',
        'Bierze udział w pracach dotyczących realizacji umowy na zakup biletów oraz umowy na tłumaczenia (postępowania o udzielenie zamówień publicznych, monitorowanie realizacji umów).',
        'Koordynuje przygotowanie wkładów do odpowiedzi na zapytania publiczne, medialne, interpelacje poselskie, kontrole (w tym kontrole KAS i NIK) oraz audytu.',
        'Uczestniczy w przygotowywaniu wkładu do planu zamówień publicznych Ministerstwa i koordynowania zamówień publicznych w ramach Departamentu.',
      ],
    ),
    authorizations: [],
    independence:
      'Osoba na tym stanowisku ma uprawnienia do podejmowania autonomicznych decyzji w przydzielonym zakresie bez konieczności konsultacji z przełożonymi. Pełni funkcję bezpośredniego przełożonego, zarządzając zespołem, kieruje pracą innych i ocenia ich efekty. Stanowisko wymaga zdolności przekonywania innych, a także ułatwiania rozwiązywania problemów i sporów.',
    softCompetencies: [
      'zarządzanie ludźmi',
      'podejmowanie decyzji i odpowiedzialność',
      'wykorzystywanie wiedzy i doskonalenie zawodowe',
      'organizacja pracy i orientacja na osiąganie celów',
      'współpraca',
    ],
  },
  {
    id: 'pos-bdg-wop-3',
    code: 'BDG WOP 3',
    title: 'Główny specjalista',
    orgUnitId: 'bdg-wop',
    office: 'Ministerstwo Cyfryzacji',
    department: 'Biuro Dyrektora Generalnego',
    division: 'Wydział Organizacji Pracy',
    documentName: 'OSP BDG WOP 3 główny specjalista.docx',
    fromOrganizer: false,
    purpose: 'Koordynacja procesów organizacji pracy i obiegu dokumentów w urzędzie.',
    supervisedBy: { direct: 'naczelnik wydziału', indirect: 'dyrektor generalny' },
    subordinates: { range: 'brak', quote: '☒ brak podległych pracowników' },
    tasks: tasks(
      'bdg3',
      [
        'Opracowuje projekty regulaminów, zarządzeń i procedur wewnętrznych dotyczących organizacji pracy urzędu.',
        'Koordynuje wdrożenie elektronicznego zarządzania dokumentacją w komórkach organizacyjnych.',
      ],
      [
        'Prowadzi szkolenia i konsultacje dla pracowników w zakresie obiegu dokumentów.',
        'Analizuje zgłoszenia pracowników i proponuje usprawnienia procesów.',
        'Udziela odpowiedzi na zapytania komórek organizacyjnych (klient wewnętrzny).',
      ],
    ),
    authorizations: [],
    independence: 'Samodzielnie przygotowuje projekty dokumentów i rekomendacje zmian; decyzje wdrożeniowe uzgadnia z przełożonym.',
    softCompetencies: ['orientacja na klienta/interesanta', 'komunikacja', 'rzetelność'],
  },
];
