import {
  type CostumeSet,
  changeCostume as change,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { CostumeChange } from "../session-port";
import type { HirobaEndpoints } from "./types";

/** What a platform decides for one write: the clock, the cross-check, and where undo is kept. */
export interface CostumeWriteOptions {
  readonly now: () => Date;
  /** On while costume writes have not been made for real from this platform. */
  readonly crossCheck: boolean;
  /** Keeps the pending undo record before the first post; a throw stops the write unsent. */
  readonly beginUndo: (before: CostumeSet, expectedAfter: CostumeSet) => Promise<void>;
}

/**
 * One costume write, as the core runs every write. The outcome crosses to the interface as it is:
 * sets, codes and Hiroba's own message, and never the token.
 */
export function changeCostume(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: CostumeChange,
  options: CostumeWriteOptions,
): Promise<WriteOutcome<CostumeSet>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
