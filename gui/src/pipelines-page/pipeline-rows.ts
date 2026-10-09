import type { EndedGroup, GroupNow, PipelineView } from "../pipelines";

/** The blocks for the groups in a pipeline: the running ones, then those waiting. */
export const BLOCKS = 10;

/** The cells for the groups that ended, the newest first. */
export const ENDED_CELLS = 12;

export interface BlockRow {
  /** A group to a block, `BLOCKS` at most, the running ones first. */
  readonly groups: readonly GroupNow[];
  /** More groups than blocks: the last block stands for the rest as well. */
  readonly more: boolean;
  /** The groups waiting, the running ones not counted. */
  readonly waiting: number;
}

export function blockRow(view: Pick<PipelineView, "running" | "waiting">): BlockRow {
  const groups = [...view.running, ...view.waiting];
  return {
    groups: groups.slice(0, BLOCKS),
    more: groups.length > BLOCKS,
    waiting: view.waiting.length,
  };
}

/** A group that ended, named the same in every read of the view. */
export const endedKey = (group: EndedGroup): string =>
  `${group.startedAt}:${group.endedAt}:${group.operation}`;

/** What the details show: a group now in the pipeline, by its id, or one that ended, as it was. */
export type Picked =
  | {
      readonly kind: "now";
      readonly id: number;
      readonly operation: string;
      readonly askedAt: number;
    }
  | { readonly kind: "ended"; readonly group: EndedGroup };

export const pickedNow = (group: GroupNow): Picked => ({
  kind: "now",
  id: group.id,
  operation: group.operation,
  askedAt: group.askedAt,
});

/** The pick after a new read: a group that left the pipeline goes on as the group it ended as, the
 * first of its operation to start once it was asked; a group that is not listed is let go. */
export function followed(picked: Picked | null, view: PipelineView): Picked | null {
  if (picked === null || picked.kind === "ended") {
    return picked;
  }
  if ([...view.running, ...view.waiting].some((group) => group.id === picked.id)) {
    return picked;
  }
  const ended = view.ended
    .filter((group) => group.operation === picked.operation && group.startedAt >= picked.askedAt)
    .at(-1);
  return ended === undefined ? null : { kind: "ended", group: ended };
}
