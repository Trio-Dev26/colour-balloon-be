// Code format (Decision Log D13, changed 13 Oct 2026): a type prefix plus a
// number from one system-wide counter per type. Codes carry no meaning, so
// moving, reordering or editing an item never changes its code.
export const CODE_PREFIX = {
  module: 'M',
  unit: 'U',
  lesson: 'L',
  quiz: 'QZ',
  question: 'QN',
} as const;

/** At least three digits; grows past 999 instead of truncating (U999 -> U1000). */
export const formatCode = (prefix: string, n: number) =>
  `${prefix}${String(n).padStart(3, '0')}`;
