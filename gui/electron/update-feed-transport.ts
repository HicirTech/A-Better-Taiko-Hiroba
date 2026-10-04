import type { Transport } from "@abth/core";

import { createHirobaTransport, type HirobaTransportOptions } from "./hiroba-transport";

/** Hiroba's transport with a holder that never holds a session, so a feed request carries none. */
export function createUpdateFeedTransport(
  options: Pick<HirobaTransportOptions, "userAgent" | "hirobaOrigin" | "fetch">,
): Transport {
  return createHirobaTransport({ ...options, session: { get: () => null, set: () => undefined } });
}
