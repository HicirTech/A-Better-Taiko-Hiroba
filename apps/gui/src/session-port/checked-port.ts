import { PORT_ARGUMENTS } from "./arguments";
import type { HirobaSessionPort } from "./types";

/**
 * The port with every verb's arguments checked before the verb runs, as the desktop's main process
 * checks them for the window. A shell whose window shares the process with the platform layer has no
 * boundary of its own to do it at, so the port is wrapped; a call that fails the check is rejected,
 * as an IPC call is, and the verb never sees it.
 */
export function checkedPort(port: HirobaSessionPort): HirobaSessionPort {
  const checked: Partial<
    Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>
  > = {};
  for (const verb of Object.keys(PORT_ARGUMENTS) as (keyof HirobaSessionPort)[]) {
    checked[verb] = (...args) =>
      PORT_ARGUMENTS[verb](args)
        ? (port[verb] as (...values: unknown[]) => Promise<unknown>)(...args)
        : Promise.reject(new Error(`Refused ${verb}: arguments it does not take`));
  }
  return checked as HirobaSessionPort;
}
