/** Normalizacja do porównań: małe litery, bez polskich znaków, pojedyncze spacje. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/\s+/g, ' ')
    .trim();
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function sentences(text: string): string[] {
  return collapseWhitespace(text)
    .split(/(?<=[.;!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function truncate(text: string, max = 220): string {
  const clean = collapseWhitespace(text);
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** Zwraca dopasowane wzorce (w postaci znormalizowanej). Wzorce to rdzenie słów. */
export function matchStems(text: string, stems: readonly string[]): string[] {
  const haystack = normalize(text);
  return stems.filter((stem) => haystack.includes(normalize(stem)));
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
