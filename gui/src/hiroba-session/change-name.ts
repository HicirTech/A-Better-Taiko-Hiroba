import {
  changeName as change,
  type NameState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { NameChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/** One rename as the core runs it; the outcome crosses as it is, never with the token. */
export function changeName(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: NameChange,
  options: WriteOptions,
): Promise<WriteOutcome<NameState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
