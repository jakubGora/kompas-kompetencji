export interface AppEnvironment {
  readonly production: boolean;
  /** Prefiks REST API. Mock przechwytuje żądania pod tym adresem. */
  readonly apiBaseUrl: string;
  /** `true` — żądania obsługuje mock w przeglądarce (localStorage); `false` — prawdziwy backend. */
  readonly useMockBackend: boolean;
  /** Przełącznik kont i scenariuszy demonstracyjnych (backend obsługuje `/demo/*`). */
  readonly demoMode: boolean;
  /** Symulowane opóźnienie mocka [min, max] w ms (zwykłe żądania). */
  readonly mockLatencyMs: readonly [number, number];
  /** Symulowane opóźnienie odpowiedzi asystenta AI [min, max] w ms. */
  readonly mockAiLatencyMs: readonly [number, number];
}
