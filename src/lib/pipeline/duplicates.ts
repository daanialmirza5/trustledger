import { prisma } from "@/lib/db/client";

export interface DuplicateCandidate {
  existingTransactionId: string;
  reason: string;
}

/**
 * Same-amount + same-day (±1 day) + similar description is treated as a
 * likely duplicate. This is a review flag, not an auto-reject — see
 * section 12: duplicates always go through human review.
 */
export async function findDuplicate(
  organizationId: string,
  candidate: { amount: number; date: Date; description: string }
): Promise<DuplicateCandidate | null> {
  const windowStart = new Date(candidate.date.getTime() - 86400000);
  const windowEnd = new Date(candidate.date.getTime() + 86400000);

  const nearby = await prisma.transaction.findMany({
    where: {
      organizationId,
      amount: candidate.amount,
      date: { gte: windowStart, lte: windowEnd },
    },
    take: 5,
  });

  if (nearby.length === 0) return null;

  const normalizedCandidate = candidate.description.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = nearby.find((tx) => {
    const normalizedExisting = tx.description.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalizedExisting === normalizedCandidate || normalizedExisting.includes(normalizedCandidate.slice(0, 8));
  });

  if (!match) return null;
  return {
    existingTransactionId: match.id,
    reason: `Same amount (₹${candidate.amount}) and a similar description within 1 day of an existing transaction.`,
  };
}
