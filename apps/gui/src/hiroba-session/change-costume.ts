import {
  type CostumeSet,
  changeCostume as change,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { CostumeChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/**
 * One costume write, as the core runs every write. The outcome crosses to the interface as it is:
 * sets, codes and Hiroba's own message, and never the token.
 */
export function changeCostume(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: CostumeChange,
  options: WriteOptions<CostumeSet>,
): Promise<WriteOutcome<CostumeSet>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
