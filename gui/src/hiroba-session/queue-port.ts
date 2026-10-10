import { type Result, SONG_PICKER_REQUESTS, type Transport } from "@abth/core";

import {
  type CodedFailure,
  type EndedGroup,
  type GroupAsked,
  type Pipeline,
  type PipelineLog,
  resultFailure,
  viewOfPipeline,
} from "../pipelines";
import {
  type HirobaSessionPort,
  type PipelinesView,
  PORT_QUEUEING,
  type PortImplementation,
  type WriteOutcomeView,
} from "../session-port";
import { PICTURE_OPERATION } from "./read-picture";
import { BUSY_OUTCOME } from "./session-writes";

/** The pipelines the port's verbs run in. */
export interface PortPipelines {
  readonly io: Pipeline;
  readonly external: Pipeline;
}

/** The pipelines' histories, under the same names, with Hiroba's pictures kept apart. */
export interface PortLogs {
  readonly io: PipelineLog;
  readonly pictures: PipelineLog;
  readonly external: PipelineLog;
}

const isPicture = (group: { readonly operation: string }) => group.operation === PICTURE_OPERATION;

/** Keeps each of Hiroba's groups as it ends: a picture apart from the rest, and only one that
 * asked Hiroba for it, not one found on the device. */
export function keepHirobaEnded(
  logs: Pick<PortLogs, "io" | "pictures">,
): (group: EndedGroup) => void {
  return (group) => {
    if (!isPicture(group)) {
      logs.io.add(group);
    } else if (group.requests > 0) {
      logs.pictures.add(group);
    }
  };
}

/** The pipelines as the pipelines page shows them, each with its newest `history` that ended. */
export function viewOfPipelines(
  pipelines: PortPipelines,
  logs: PortLogs,
  history: number,
): PipelinesView {
  return {
    io: viewOfPipeline(pipelines.io, logs.io, history, (group) => !isPicture(group)),
    pictures: viewOfPipeline(pipelines.io, logs.pictures, history, isPicture),
    external: viewOfPipeline(pipelines.external, logs.external, history),
  };
}

/** What a write ends in that counts as done: saved, or nothing there was to save. */
const DONE: ReadonlySet<WriteOutcomeView<unknown>["kind"]> = new Set([
  "applied",
  "appliedNotSynced",
  "nothingToChange",
]);

/** `GroupAsked.failureOf` for a write: null when it is done, else its kind and any code in it. */
export function writeFailure(outcome: WriteOutcomeView<unknown>): string | null {
  if (DONE.has(outcome.kind)) {
    return null;
  }
  switch (outcome.kind) {
    case "readFailed":
    case "outcomeUnknown":
      return `${outcome.kind} ${outcome.failure.kind}`;
    case "stoppedBeforeWrite":
      return `${outcome.kind} ${outcome.code}`;
    default:
      return outcome.kind;
  }
}

/** The verbs whose requests are counted before they start. */
const EXPECTED_REQUESTS: Partial<Record<keyof HirobaSessionPort, number>> = {
  readSongPicker: SONG_PICKER_REQUESTS,
};

const readAsked = (operation: keyof HirobaSessionPort): GroupAsked<unknown> => {
  const expected = EXPECTED_REQUESTS[operation];
  return {
    operation,
    failureOf: (result) => resultFailure(result as Result<unknown, CodedFailure>),
    ...(expected === undefined ? {} : { expectedRequests: expected }),
  };
};

const writeAsked = (operation: keyof HirobaSessionPort): GroupAsked<unknown> => ({
  operation,
  failureOf: (outcome) => writeFailure(outcome as WriteOutcomeView<unknown>),
});

/** `port` with each verb run as `PORT_QUEUEING` says: the one place a shell queues its verbs. */
export function queuePort(pipelines: PortPipelines, port: PortImplementation): HirobaSessionPort {
  const { io, external } = pipelines;
  const queued: Partial<Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>> =
    {};
  for (const verb of Object.keys(PORT_QUEUEING) as (keyof HirobaSessionPort)[]) {
    const run = port[verb] as (...args: unknown[]) => Promise<unknown>;
    const inGroup =
      (...args: unknown[]) =>
      (transport: Transport) =>
        run(transport, ...args);
    switch (PORT_QUEUEING[verb]) {
      case "read":
        queued[verb] = (...args) => io.read(readAsked(verb), inGroup(...args));
        break;
      case "exclusive":
        queued[verb] = (...args) => io.exclusive(readAsked(verb), inGroup(...args));
        break;
      case "write":
        queued[verb] = (...args) => io.write(writeAsked(verb), inGroup(...args), BUSY_OUTCOME);
        break;
      case "external":
        queued[verb] = (...args) => external.read(readAsked(verb), inGroup(...args));
        break;
      case "unqueued":
        queued[verb] = run;
        break;
    }
  }
  return queued as HirobaSessionPort;
}
