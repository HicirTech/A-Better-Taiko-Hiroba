/** A count's share of its block, as a number and as the locale writes a percent. */
export interface Share {
  /** 0 to 1. Every item of a block that sums to 0 has a share of 0. */
  readonly share: number;
  /** With one decimal, as the locale writes a percent: "19.9%" in English. */
  readonly percent: string;
}

/**
 * Each item's share of the sum of its block, for a block drawn as GitHub's "Languages" box draws
 * one. Every item keeps its place, an item at 0 included, and a block that sums to 0 gives 0 to
 * each rather than dividing by it.
 */
export function sharesOf<T extends { readonly count: number }>(
  items: readonly T[],
  locale: string,
): { readonly total: number; readonly rows: readonly (T & Share)[] } {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return {
    total,
    rows: items.map((item) => {
      const share = total === 0 ? 0 : item.count / total;
      return { ...item, share, percent: percent.format(share) };
    }),
  };
}
