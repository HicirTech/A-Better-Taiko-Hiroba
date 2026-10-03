import { PORT_ARGUMENTS } from "./arguments";
import type { HirobaSessionPort } from "./types";

/** The port with every verb's arguments checked before it runs, as the desktop's main process does
 * for the window. A window in the same process has no boundary: a bad call is rejected like IPC. */
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
