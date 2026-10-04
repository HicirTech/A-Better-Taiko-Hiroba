import {
  changeFolder as change,
  type FolderState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { FolderChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/** One folder write as the core runs it; the outcome crosses as it is, never with the token. */
export function changeFolder(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: FolderChange,
  options: WriteOptions,
): Promise<WriteOutcome<FolderState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
