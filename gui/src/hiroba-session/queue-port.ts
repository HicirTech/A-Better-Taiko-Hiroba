import type { Pipeline } from "../pipelines";
import { type HirobaSessionPort, PORT_QUEUEING } from "../session-port";
import { BUSY_OUTCOME } from "./session-writes";

/** The pipelines the port's verbs run in. */
export interface PortPipelines {
  readonly io: Pipeline;
}

/** `port` with each verb run as `PORT_QUEUEING` says: the one place a shell queues its verbs. */
export function queuePort(pipelines: PortPipelines, port: HirobaSessionPort): HirobaSessionPort {
  const { io } = pipelines;
  const queued: Partial<Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>> =
    {};
  for (const verb of Object.keys(PORT_QUEUEING) as (keyof HirobaSessionPort)[]) {
    const run = port[verb] as (...args: unknown[]) => Promise<unknown>;
    switch (PORT_QUEUEING[verb]) {
      case "read":
        queued[verb] = io.read(run);
        break;
      case "exclusive":
        queued[verb] = io.exclusive(run);
        break;
      case "write":
        queued[verb] = io.write(run, BUSY_OUTCOME);
        break;
      case "unqueued":
        queued[verb] = run;
        break;
    }
  }
  return queued as HirobaSessionPort;
}
