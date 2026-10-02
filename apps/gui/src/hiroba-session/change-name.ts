import {
  changeName as change,
  type NameState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { NameChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/**
 * One rename, as the core runs every write. The outcome crosses to the interface as it is: names,
 * codes and Hiroba's own message, and never the token.
 */
export function changeName(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: NameChange,
  options: WriteOptions<NameState>,
): Promise<WriteOutcome<NameState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
