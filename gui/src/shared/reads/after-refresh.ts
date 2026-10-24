import type { Result } from "@abth/core";

import type { HirobaSessionPort, ReadFailure } from "../session-port";

/** A read again: Hiroba refreshes its copy first, and a failed refresh is the read's failure. */
export async function afterRefresh<T>(
  port: Pick<HirobaSessionPort, "refreshHiroba">,
  read: () => Promise<Result<T, ReadFailure>>,
): Promise<Result<T, ReadFailure>> {
  const refreshed = await port.refreshHiroba();
  return refreshed.ok ? read() : refreshed;
}
