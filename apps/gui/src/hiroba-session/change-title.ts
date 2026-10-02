import {
  changeTitle as change,
  type TitleState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { TitleChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/**
 * One title write, as the core runs every write. The outcome crosses to the interface as it is:
 * titles, codes and Hiroba's own message, and never the token.
 */
export function changeTitle(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: TitleChange,
  options: WriteOptions<TitleState>,
): Promise<WriteOutcome<TitleState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
