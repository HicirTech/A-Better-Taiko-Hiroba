/** taiko.wiki's public list of every song. */
export const SONG_CATALOGUE_URL = "https://taiko.wiki/api/v1/song/all";

/** The API of the Chinese Taiko wiki, whose song pages give the official Chinese names. */
export const CHINESE_NAMES_URL = "https://taiko.fandom.com/zh/api.php";

/** A development run reads only the stand-in it is given, so it never reaches the real site. */
export function catalogueUrlFor(
  development: boolean,
  override: string | undefined,
  real: string = SONG_CATALOGUE_URL,
): string | undefined {
  return development ? override || undefined : real;
}
