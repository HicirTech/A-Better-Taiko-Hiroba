import type { CatalogueSong } from "../song-catalogue/types";

/** Orders the highest song number first: the newest song. */
export const newestFirst = (a: Pick<CatalogueSong, "songNo">, b: Pick<CatalogueSong, "songNo">) =>
  Number(b.songNo) - Number(a.songNo);
