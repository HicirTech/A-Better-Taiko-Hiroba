import {
  changeTitle as change,
  type TitleState,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { TitleChange } from "../session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/** One title write as the core runs it; the outcome crosses as it is, never with the token. */
export function changeTitle(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: TitleChange,
  options: WriteOptions,
): Promise<WriteOutcome<TitleState>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
