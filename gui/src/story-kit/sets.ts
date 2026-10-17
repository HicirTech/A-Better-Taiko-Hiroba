import { type FavoriteSet, SET_SONG_LIMIT } from "../favorites/favorite-sets";
import { STORY_SONGS } from "./songs";

const songNos = STORY_SONGS.map((song) => song.songNo);

/** Sets as a player keeps them on the device: a short one, a full one and a long-named one. */
export const STORY_SETS: readonly FavoriteSet[] = [
  { id: "story-set-1", name: "練習用", songs: ["1001", "1005", "1008", "1012"] },
  { id: "story-set-2", name: "Party picks", songs: songNos.slice(0, SET_SONG_LIMIT) },
  {
    id: "story-set-3",
    name: "段位道場に向けて毎日叩く曲たち（長い名前のセット）",
    songs: ["1010", "1002"],
  },
];
