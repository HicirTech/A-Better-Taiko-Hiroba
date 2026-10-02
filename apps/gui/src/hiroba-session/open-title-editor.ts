import { openTitleEditor as openEditor, type Result, type Transport } from "@abth/core";

import type { ReadFailure, TitleEditorView } from "../session-port";
import type { HirobaEndpoints } from "./types";

/**
 * Reads the title page once, for the interface: the title worn and the titles the account owns.
 * The page's form token is left in the core; a read failure carries codes only.
 */
export function openTitleEditor(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<TitleEditorView, ReadFailure>> {
  return openEditor({ transport, hirobaOrigin: endpoints.hirobaOrigin });
}
