export interface Share {
  /** 0 to 1. Every item of a block that sums to 0 has a share of 0. */
  readonly share: number;
  /** With one decimal, as the locale writes a percent: "19.9%" in English. */
  readonly percent: string;
}

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
