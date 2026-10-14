import type { Prisma } from '../../generated/prisma/client';

/**
 * Hands out the next number for a code prefix. Call it inside the transaction
 * that inserts the record: the counter row stays locked until commit, so
 * concurrent inserts get distinct numbers, and a rolled-back insert uses none.
 * Deleting a record never decrements the counter, so codes are never reused.
 */
export async function nextCodeNumber(
  tx: Prisma.TransactionClient,
  scope: string,
): Promise<number> {
  const { lastValue } = await tx.codeSequence.upsert({
    where: { scope },
    create: { scope, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return lastValue;
}
