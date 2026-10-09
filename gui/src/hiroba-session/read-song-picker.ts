import { type Result, readSongPicker as readPicker, type Transport } from "@abth/core";

import type { PickableSongs, ReadFailure } from "../session-port";
import type { HirobaEndpoints } from "./types";

/** Reads the songs Hiroba's own 大好きな曲 picker offers; the form token stays in the core. */
export function readSongPicker(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<PickableSongs, ReadFailure>> {
  return readPicker({ transport, hirobaOrigin: endpoints.hirobaOrigin });
}
