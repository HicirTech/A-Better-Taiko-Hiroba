import { openCostumeEditor as openEditor, type Result, type Transport } from "@abth/core";

import type { CostumeEditorView, ReadFailure } from "../session-port";
import type { HirobaEndpoints } from "./types";

/**
 * Reads the costume editor once, for the interface: the set, the palette and each slot's owned
 * items. The page's form token is left in the core; a read failure carries codes only.
 */
export function openCostumeEditor(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<CostumeEditorView, ReadFailure>> {
  return openEditor({ transport, hirobaOrigin: endpoints.hirobaOrigin });
}
