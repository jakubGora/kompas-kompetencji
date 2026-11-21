const SEPARATOR = ';';

function escapeCell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(SEPARATOR)).join('\r\n');
}

/** Średnik i BOM — plik otwiera się poprawnie w polskiej wersji Excela. */
export function downloadCsv(document: Document, filename: string, rows: readonly (readonly string[])[]): void {
  const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
