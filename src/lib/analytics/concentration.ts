export interface ConcentrationEntry {
  id: string;
  name: string;
  share: number;
}

export interface ConcentrationResult {
  topEntity: ConcentrationEntry | null;
  top5Share: number;
  entries: ConcentrationEntry[];
}

/** Generic concentration calc: share of total attributable to each id in `amountsById`. */
export function computeConcentration(
  amountsById: Map<string, { name: string; amount: number }>
): ConcentrationResult {
  const total = Array.from(amountsById.values()).reduce((s, v) => s + v.amount, 0);
  if (total <= 0) return { topEntity: null, top5Share: 0, entries: [] };

  const entries: ConcentrationEntry[] = Array.from(amountsById.entries())
    .map(([id, v]) => ({ id, name: v.name, share: v.amount / total }))
    .sort((a, b) => b.share - a.share);

  const top5Share = entries.slice(0, 5).reduce((s, e) => s + e.share, 0);

  return { topEntity: entries[0] ?? null, top5Share, entries };
}
