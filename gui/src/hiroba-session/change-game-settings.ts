import {
  changeGameSettings as change,
  type GameSettings,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import type { GameSettingsChange } from "../shared/session-port";
import type { HirobaEndpoints, WriteOptions } from "./types";

/** One settings write as the core runs it; the outcome crosses as it is, never with the token. */
export function changeGameSettings(
  transport: Transport,
  endpoints: HirobaEndpoints,
  { expected, target }: GameSettingsChange,
  options: WriteOptions,
): Promise<WriteOutcome<GameSettings>> {
  return change(
    { expected, target },
    { transport, hirobaOrigin: endpoints.hirobaOrigin, ...options },
  );
}
