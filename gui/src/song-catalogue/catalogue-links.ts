/** taiko.wiki's public list of every song. */
export const SONG_CATALOGUE_URL = "https://taiko.wiki/api/v1/song/all";

/** A development run reads only the stand-in it is given, so it never reaches the real site. */
export function catalogueUrlFor(
  development: boolean,
  override: string | undefined,
): string | undefined {
  return development ? override || undefined : SONG_CATALOGUE_URL;
}
