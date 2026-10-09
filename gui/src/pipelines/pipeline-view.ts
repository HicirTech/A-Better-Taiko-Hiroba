import type { EndedGroup, GroupNow, Pipeline } from "./pipeline";
import type { PictureTally, PipelineLog } from "./pipeline-log";

/** A pipeline as the pipelines page shows it: what runs and waits now, what ended, the pictures. */
export interface PipelineView {
  readonly running: readonly GroupNow[];
  readonly waiting: readonly GroupNow[];
  /** The newest first. */
  readonly ended: readonly EndedGroup[];
  readonly pictures: PictureTally;
}

/** `pipeline` and its `log` as one view, with the newest `history` groups that ended. */
export function viewOfPipeline(
  pipeline: Pick<Pipeline, "now">,
  log: PipelineLog,
  history: number,
): PipelineView {
  return { ...pipeline.now(), ...log.history(history) };
}
