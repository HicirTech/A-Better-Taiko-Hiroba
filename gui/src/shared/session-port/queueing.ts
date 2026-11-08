import type { Transport } from "@abth/core";

import type { PORT_CALLS, VerbQueueing } from "./port-calls";
import type { HirobaSessionPort } from "./types";

/** The verbs the table puts in the way `How` says: what a test of that way must cover. */
export type VerbsQueued<How extends VerbQueueing> = {
  [V in keyof typeof PORT_CALLS]: (typeof PORT_CALLS)[V]["queueing"] extends How ? V : never;
}[keyof typeof PORT_CALLS];

/** A verb as a shell writes it: one in a pipeline sends through its own group's transport. */
export type VerbImplementation<V extends keyof HirobaSessionPort> =
  (typeof PORT_CALLS)[V]["queueing"] extends "unqueued"
    ? HirobaSessionPort[V]
    : (
        transport: Transport,
        ...args: Parameters<HirobaSessionPort[V]>
      ) => ReturnType<HirobaSessionPort[V]>;

/** A shell's verbs before `queuePort` puts each in its pipeline. */
export type PortImplementation = {
  readonly [V in keyof HirobaSessionPort]: VerbImplementation<V>;
};
