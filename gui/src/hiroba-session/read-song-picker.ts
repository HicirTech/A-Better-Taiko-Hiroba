import { type Result, readSongPicker as readPicker, type Transport } from "@abth/core";

import type { PickableSongs, ReadFailure } from "../session-port";
import type { HirobaQueue } from "./hiroba-queue";
import type { HirobaEndpoints } from "./types";

/** How long nothing may wait in the queue before the picker's dozen requests go in. */
const QUIET_MS = 1500;

/** Reads the songs Hiroba's own 大好きな曲 picker offers; the form token stays in the core. */
export function readSongPicker(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<PickableSongs, ReadFailure>> {
  return readPicker({ transport, hirobaOrigin: endpoints.hirobaOrigin });
}

/** `read` in the queue once it has been quiet a while: what is asked meanwhile goes first. */
export function whenQueueQuiet<R>(
  queue: Pick<HirobaQueue, "oneAtATime" | "whenQuiet">,
  read: () => Promise<R>,
): () => Promise<R> {
  const queued = queue.oneAtATime(read);
  return async () => {
    await queue.whenQuiet(QUIET_MS);
    return queued();
  };
}
