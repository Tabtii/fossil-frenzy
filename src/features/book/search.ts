function normalize(value: string): string {
  return value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ß', 'ss');
}

/** Every word must match; accents, case and extra whitespace are ignored. */
export function matchesSearch(query: string, ...fields: string[]): boolean {
  const text = normalize(fields.join(' '));
  return normalize(query).trim().split(/\s+/).every((word) => text.includes(word));
}
