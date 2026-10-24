import type { EndedGroup, GroupNow, Pipeline } from "./pipeline";
import type { PipelineLog } from "./pipeline-log";

/** A pipeline as the pipelines page shows it: what runs and waits now, and what ended. */
export interface PipelineView {
  readonly running: readonly GroupNow[];
  readonly waiting: readonly GroupNow[];
  /** The newest first. */
  readonly ended: readonly EndedGroup[];
}

/** The groups of `pipeline` that `shows` picks, with the newest `history` in `log` that ended. */
export function viewOfPipeline(
  pipeline: Pick<Pipeline, "now">,
  log: PipelineLog,
  history: number,
  shows: (group: GroupNow) => boolean = () => true,
): PipelineView {
  const { running, waiting } = pipeline.now();
  return {
    running: running.filter(shows),
    waiting: waiting.filter(shows),
    ...log.history(history),
  };
}
