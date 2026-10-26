import { mappingOf } from "../../src/shared/song-catalogue/ese-chart-files";

/** A song to draw: its number on Hiroba, and its chart's path inside ESE. */
export interface CdnWork {
  readonly songNo: string;
  readonly path: string;
}

/** The songs OurTaiko's map names, by number, each with a path the apps would accept. */
export function workOf(mappingText: string): readonly CdnWork[] {
  const mapping = mappingOf(mappingText);
  if (mapping === null) {
    return [];
  }
  // The map's paths come escaped for an address; the clone wants them as they are.
  return [...mapping]
    .map(([songNo, address]) => ({
      songNo,
      path: address.split("/").map(decodeURIComponent).join("/"),
    }))
    .sort((one, other) => Number(one.songNo) - Number(other.songNo));
}
