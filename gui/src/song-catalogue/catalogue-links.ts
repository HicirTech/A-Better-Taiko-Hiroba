/** taiko.wiki's public list of every song. */
export const SONG_CATALOGUE_URL = "https://taiko.wiki/api/v1/song/all";

/** The API of the Chinese Taiko wiki, whose song pages give the official Chinese names. */
export const CHINESE_NAMES_URL = "https://taiko.fandom.com/zh/api.php";

/** The hosts taiko.wiki's chart pictures sit on. */
export const CHART_PICTURE_HOSTS: readonly string[] = [
  "file.taiko.wiki",
  "cdn.wikiwiki.jp",
  "i.imgur.com",
];

/** A development run reads only the stand-in it is given, so it never reaches the real site. */
export function catalogueUrlFor(
  development: boolean,
  override: string | undefined,
  real: string = SONG_CATALOGUE_URL,
): string | undefined {
  return development ? override || undefined : real;
}

/** A development run also reads chart pictures at the stand-in's origin, if it is given one. */
export function chartOriginFor(
  development: boolean,
  override: string | undefined,
): string | undefined {
  return development ? override || undefined : undefined;
}

/** Whether `address` is a chart picture's: https on a chart host, or at `chartOrigin`. */
export function isChartPictureAddress(address: string, chartOrigin: string | undefined): boolean {
  try {
    const url = new URL(address);
    if (url.protocol === "https:" && CHART_PICTURE_HOSTS.includes(url.host)) {
      return true;
    }
    return chartOrigin !== undefined && url.origin === new URL(chartOrigin).origin;
  } catch {
    return false;
  }
}
