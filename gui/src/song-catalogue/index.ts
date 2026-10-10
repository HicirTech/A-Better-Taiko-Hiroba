// The song lists, which need no window, so the main process and the Android shell share them.
export {
  CHART_PICTURE_HOSTS,
  CHINESE_NAMES_URL,
  catalogueUrlFor,
  chartOriginFor,
  isChartPictureAddress,
  SONG_CATALOGUE_URL,
} from "./catalogue-links";
export { officialNames, parseChineseNamesBatch } from "./chinese-names";
export {
  CHART_PICTURE_MAX_BYTES,
  CHART_PICTURE_OPERATION,
  createChartPictureReader,
} from "./read-chart-picture";
export { readChineseNames } from "./read-chinese-names";
export { readSongCatalogue } from "./read-song-catalogue";
export {
  type CatalogueSong,
  type ChineseNamesPage,
  type ChineseNamesRead,
  DIFFICULTIES,
  type Difficulty,
  type SongCatalogueFailure,
  type SongCatalogueRead,
} from "./types";
export { MAX_CATALOGUE_LENGTH, parseWikiSongs } from "./wiki-songs";
