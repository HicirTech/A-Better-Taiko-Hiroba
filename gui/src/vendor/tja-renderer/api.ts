// @ts-nocheck: TJA Renderer's own code, written for a laxer tsconfig than this app's.
import type { HitInfo } from "./hit-testing.js";
import {
  createChartViewImpl,
  createCycleHandHandler as createCycleHandHandlerImpl,
  createToggleRollingHandler as createToggleRollingHandlerImpl,
  createToggleSeparatorHandler as createToggleSeparatorHandlerImpl,
  getChartInfoImpl,
  type NoteInteractionEvent,
  type NoteInteractionHandler,
} from "./internal.js";
import type { LayoutRatios } from "./layout.js";
import { type Annotation, BranchName, type NoteLocation, NoteLocationMap, type NoteType } from "./primitives.js";

export type { Annotation, HitInfo, LayoutRatios, NoteInteractionEvent, NoteInteractionHandler, NoteLocation, NoteType };
export { BranchName, NoteLocationMap };

// ── Types ───────────────────────────────────────────────────────────────────

export interface CourseSpecifier {
  difficulty: string;
  playerSide?: string;
}

export interface ChartInfo {
  courseSpecifiers: CourseSpecifier[];
  hasBranching(course: CourseSpecifier): boolean;
}

export interface ZoomByBeatsPerLine {
  beatsPerLine: number;
}

export type ZoomLevel = "auto" | ZoomByBeatsPerLine;

export type BranchSelection = "auto" | BranchName;

export interface ChartViewOptions {
  /** Zoom level. `auto` to fit content with best effort to ensure a minimum note size. */
  zoom?: ZoomLevel;

  /** Branch to render. `auto` to render all branches with unreachable sections hidden. */
  branch?: BranchSelection;

  /** Device Pixel Ratio (DPR) for rendering. */
  dpr?: number;

  /** Whether to display the TJA and renderer software attribution text at the bottom. */
  showAttribution?: boolean;

  /**
   * Name of the source of the TJA file.
   * Displayed in the attribution text if showAttribution is true.
   */
  tjaSourceName?: string;

  /**
   * Partial overrides for the layout ratios.
   * All values are ratios relative to `baseBarWidth` (the pixel width of a 4/4 bar).
   * Only the specified fields are overridden; unspecified fields use defaults.
   */
  layoutRatios?: Partial<LayoutRatios>;
}

export const CREATE_CHART_OPTIONS_DEFAULTS: Required<Pick<ChartViewOptions, "zoom" | "branch" | "showAttribution">> = {
  zoom: { beatsPerLine: 16 },
  branch: "auto",
  showAttribution: true,
};

export interface ChartView {
  /** Update the annotations displayed on the chart and re-render. */
  applyAnnotations(annotations: NoteLocationMap<Annotation>): void;

  /**
   * Register a handler called when the user hovers over the canvas.
   * The handler receives hit testing results for the hovered position.
   * Returns a cleanup function that removes the listener.
   */
  onNoteHovered(handler: NoteInteractionHandler): () => void;

  /**
   * Register a handler called when the user clicks on the canvas.
   * The handler receives hit testing results for the clicked position.
   * Returns a cleanup function that removes the listener.
   */
  onNoteClicked(handler: NoteInteractionHandler): () => void;
}

// ── Functions ───────────────────────────────────────────────────────────────

/**
 * Parses a TJA string and returns information about available courses.
 */
export function getChartInfo(tjaContent: string): ChartInfo {
  return getChartInfoImpl(tjaContent);
}

/**
 * Renders a TJA chart to the provided canvas.
 *
 * @param tjaContent The TJA file content as a string.
 * @param canvas The HTMLCanvasElement to render to. Must be in the DOM for correct sizing.
 * @param course The course specifier. If omitted, uses the highest difficulty and player 1 side.
 * @param options Chart creation and rendering options.
 */
export function createChartView(
  tjaContent: string,
  canvas: HTMLCanvasElement,
  course?: CourseSpecifier,
  options?: ChartViewOptions,
): ChartView {
  return createChartViewImpl(tjaContent, canvas, course, options);
}

/**
 * Creates a NoteInteractionHandler that cycles hand annotation (none -> L -> R -> none)
 * on judgeable notes. Non-judgeable notes are ignored.
 */
export function createCycleHandHandler(
  getAnnotations: () => NoteLocationMap<Annotation>,
  onChange: (annotations: NoteLocationMap<Annotation>) => void,
): NoteInteractionHandler {
  return createCycleHandHandlerImpl(getAnnotations, onChange);
}

/**
 * Creates a NoteInteractionHandler that toggles separator annotation
 * on judgeable notes. Non-judgeable notes are ignored.
 */
export function createToggleSeparatorHandler(
  getAnnotations: () => NoteLocationMap<Annotation>,
  onChange: (annotations: NoteLocationMap<Annotation>) => void,
): NoteInteractionHandler {
  return createToggleSeparatorHandlerImpl(getAnnotations, onChange);
}

/**
 * Creates a NoteInteractionHandler that toggles the roll annotation on judgeable
 * notes, labelling them as rolling from the preceding note. Non-judgeable notes are ignored.
 */
export function createToggleRollingHandler(
  getAnnotations: () => NoteLocationMap<Annotation>,
  onChange: (annotations: NoteLocationMap<Annotation>) => void,
): NoteInteractionHandler {
  return createToggleRollingHandlerImpl(getAnnotations, onChange);
}
