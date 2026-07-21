import { TYPES } from "./assets";

/** Keyboard/debug input order follows personality types 01–05. */
export const TYPE_ORDER = [
  "absorb",
  "reflect",
  "withdraw",
  "transform",
  "diffuse",
];

/** Fixed visual order used by the distribution bar artwork. */
export const BAR_ORDER = [
  "reflect",
  "transform",
  "withdraw",
  "diffuse",
  "absorb",
];

export const EMPTY_COUNTS = Object.fromEntries(
  TYPE_ORDER.map((typeId) => [typeId, 0]),
);

function allocateWholePercentages(counts, total) {
  if (total === 0) {
    return Object.fromEntries(TYPE_ORDER.map((typeId) => [typeId, 0]));
  }

  const shares = TYPE_ORDER.map((typeId, order) => {
    const exact = (counts[typeId] / total) * 100;
    return {
      typeId,
      order,
      percent: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let remaining = 100 - shares.reduce((sum, item) => sum + item.percent, 0);
  [...shares]
    .sort((a, b) => b.remainder - a.remainder || a.order - b.order)
    .forEach((item) => {
      if (remaining > 0) {
        shares[item.order].percent += 1;
        remaining -= 1;
      }
    });

  return Object.fromEntries(
    shares.map(({ typeId, percent }) => [typeId, percent]),
  );
}

function rankTypeIds(counts) {
  return [...TYPE_ORDER].sort(
    (a, b) =>
      counts[b] - counts[a] ||
      TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b),
  );
}

function rankMap(typeIds) {
  return Object.fromEntries(typeIds.map((typeId, index) => [typeId, index]));
}

function computeLevel(entries) {
  if (!entries.length || entries[0].count === 0) return 1;
  const lead = entries[0].percent - (entries[1]?.percent ?? 0);
  if (lead > 15) return 3;
  if (lead > 5) return 2;
  return 1;
}

export function createUltimateData(counts, previousRank = null) {
  const total = TYPE_ORDER.reduce((sum, typeId) => sum + counts[typeId], 0);
  const percentages = allocateWholePercentages(counts, total);
  const rankedTypeIds = rankTypeIds(counts);
  const currentRank = rankMap(rankedTypeIds);

  const entries = rankedTypeIds.map((typeId) => {
    let trend = "even";
    if (previousRank) {
      if (currentRank[typeId] < previousRank[typeId]) trend = "up";
      if (currentRank[typeId] > previousRank[typeId]) trend = "down";
    }

    return {
      typeId,
      count: counts[typeId],
      percent: percentages[typeId],
      trend,
    };
  });

  return {
    mode: total === 0 ? "loading" : "output",
    total,
    counts,
    entries,
    distributionEntries: BAR_ORDER.map((typeId) => ({
      typeId,
      count: counts[typeId],
      percent: percentages[typeId],
    })),
    level: computeLevel(entries),
    rank: currentRank,
  };
}

export function typeLabel(typeId) {
  const type = TYPES[typeId];
  return `${type.zh} ${type.en}`;
}
