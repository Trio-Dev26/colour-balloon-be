import { Transform } from 'class-transformer';

/** Trims surrounding whitespace so "Reading " and "Reading" are the same value. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
