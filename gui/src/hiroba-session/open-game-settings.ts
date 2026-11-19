import { openGameSettings as openSettings, type Result, type Transport } from "@abth/core";

import type { GameSettingsView, ReadFailure } from "../shared/session-port";
import type { HirobaEndpoints } from "./types";

/** Reads the settings page once, for the interface; the form token stays in the core. */
export function openGameSettings(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<GameSettingsView, ReadFailure>> {
  return openSettings({ transport, hirobaOrigin: endpoints.hirobaOrigin });
}
