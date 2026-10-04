// taiko.wiki's song list, which needs no window, so the main process and the Android shell share it.
export { catalogueUrlFor, SONG_CATALOGUE_URL } from "./catalogue-links";
export { readSongCatalogue } from "./read-song-catalogue";
export {
  type CatalogueSong,
  DIFFICULTIES,
  type Difficulty,
  type SongCatalogueFailure,
  type SongCatalogueRead,
} from "./types";
export { parseWikiSongs } from "./wiki-songs";
