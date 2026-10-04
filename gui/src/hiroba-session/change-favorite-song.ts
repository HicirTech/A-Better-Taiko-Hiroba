import {
  changeFavoriteSong as change,
  type FavoriteSongState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { FavoriteSongChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/** One 大好きな曲 write as the core runs it; the outcome crosses as it is, never with the token. */
export function changeFavoriteSong(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: FavoriteSongChange,
  options: WriteOptions,
): Promise<WriteOutcome<FavoriteSongState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
