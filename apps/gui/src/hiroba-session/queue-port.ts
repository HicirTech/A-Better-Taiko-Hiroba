import { type HirobaSessionPort, PORT_QUEUEING } from "../session-port";
import type { HirobaQueue } from "./hiroba-queue";
import { BUSY_OUTCOME } from "./session-writes";

/**
 * `port` with each verb in the queue as `PORT_QUEUEING` says, for a shell to hand its window: a read
 * waits for every verb asked for before it, a write is one turn of the queue and answers `busy`
 * while another is queued or running, and the rest are left as they are. Every shell queues its
 * verbs here and nowhere else, so none can be left outside it, and a new verb of the port cannot
 * be added without a place in the table.
 */
export function queuePort(queue: HirobaQueue, port: HirobaSessionPort): HirobaSessionPort {
  const queued: Partial<Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>> =
    {};
  for (const verb of Object.keys(PORT_QUEUEING) as (keyof HirobaSessionPort)[]) {
    const run = port[verb] as (...args: unknown[]) => Promise<unknown>;
    switch (PORT_QUEUEING[verb]) {
      case "read":
        queued[verb] = queue.oneAtATime(run);
        break;
      case "write":
        queued[verb] = queue.oneWriteAtATime(run, BUSY_OUTCOME);
        break;
      case "unqueued":
        queued[verb] = run;
        break;
    }
  }
  return queued as HirobaSessionPort;
}
