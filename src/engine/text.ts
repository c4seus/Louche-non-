export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function containsPhrase(normalizedText: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (normalizedPhrase === '') {
    return false;
  }
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

export function countPhrases(normalizedText: string, phrases: string[]): number {
  return phrases.filter((phrase) => containsPhrase(normalizedText, phrase)).length;
}

export function hasAmount(input: string): boolean {
  return /(\d+(?:[.,]\d{1,2})?\s?(?:€|eur\b|euros?\b))|(€\s?\d+(?:[.,]\d{1,2})?)/i.test(input);
}
