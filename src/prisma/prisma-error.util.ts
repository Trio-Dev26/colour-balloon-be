import { Prisma } from '../../generated/prisma/client';

/** True when `error` is a Prisma known-request error with the given code (e.g. "P2002"). */
export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/**
 * Name of the violated constraint (e.g. "modules_title_en_key") for unique and
 * foreign-key violations. With the pg driver adapter Prisma reports it under
 * `meta.driverAdapterError.cause.constraint.index` and leaves `meta.target` empty.
 */
export function violatedConstraint(
  error: Prisma.PrismaClientKnownRequestError,
): string | undefined {
  const meta = error.meta as
    | { driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
    | undefined;
  return meta?.driverAdapterError?.cause?.constraint?.index;
}
