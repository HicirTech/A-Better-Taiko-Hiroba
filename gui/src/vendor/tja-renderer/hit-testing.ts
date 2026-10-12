// @ts-nocheck: TJA Renderer's own code, written for a laxer tsconfig than this app's.
import { type ChartLayout, createLayout, resolveCanvasWidth } from "./layout.js";
import {
  BranchName,
  isBig,
  isRenderable,
  JudgementMap,
  type JudgementValue,
  type NoteLocation,
  NoteType,
  type RenderOptions,
} from "./primitives.js";
import { getEffectiveBpm, getEffectiveScroll, type ParsedChart } from "./tja-parser.js";

export interface HitInfo {
  location: NoteLocation;
  type: NoteType;
  bpm?: number;
  scroll?: number;
  ordinal?: number;
  branchStartParams?: ParsedChart["barParams"][0]["branchStartParams"];
}

export function getBranchLineAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: RenderOptions,
  layout?: ChartLayout,
): HitInfo | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    const logicalWidth = resolveCanvasWidth(canvas);
    const dpr = window.devicePixelRatio || 1;
    activeLayout = createLayout(chart, logicalWidth, options, new JudgementMap(), dpr);
  }

  const { barFrames, constants, virtualBars } = activeLayout;
  const { noteRadiusBig: NOTE_RADIUS_BIG } = constants;
  const maxRadius = NOTE_RADIUS_BIG;

  const showText =
    options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;
  const extensionHeight = showText ? constants.barNumberOffsetY + 3 * constants.statusFontSize : 0;

  // Check Branch Start Lines (Lowest priority)
  for (let index = virtualBars.length - 1; index >= 0; index--) {
    const info = virtualBars[index];
    const frame = barFrames[index];
    const params = chart.barParams[info.originalIndex];

    // Quick bounding box check
    if (
      x < frame.x - maxRadius ||
      x > frame.x + frame.width + maxRadius ||
      y < frame.y - extensionHeight - maxRadius ||
      y > frame.y + frame.height + maxRadius
    ) {
      continue;
    }

    if (params?.isBranchStart) {
      const lineX = frame.x;
      const hitWidth = 20;
      const topY = showText ? frame.y - constants.barNumberOffsetY - 3 * constants.statusFontSize : frame.y;

      if (Math.abs(x - lineX) <= hitWidth / 2 && y >= topY - maxRadius && y <= frame.y + frame.height + maxRadius) {
        return {
          location: { barIndex: info.originalIndex, charIndex: -1, branch: chart.branchType },
          type: NoteType.None,
          bpm: params.initialBpm,
          scroll: params.scroll,
          branchStartParams: params.branchStartParams,
        };
      }
    }
  }

  return null;
}

export function getNoteAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue> = new JudgementMap(),
  options: RenderOptions,
  layout?: ChartLayout,
): HitInfo | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    const logicalWidth = resolveCanvasWidth(canvas);
    const dpr = window.devicePixelRatio || 1;
    activeLayout = createLayout(chart, logicalWidth, options, judgements, dpr);
  }

  const { barFrames, constants, virtualBars } = activeLayout;
  const { noteRadiusSmall: NOTE_RADIUS_SMALL, noteRadiusBig: NOTE_RADIUS_BIG } = constants;
  const maxRadius = NOTE_RADIUS_BIG;

  const isAllBranches = !!options.showAllBranches && !!chart.branches;

  // Hit testing loop
  // Iterate backwards as per rendering order (notes on top)
  for (let index = virtualBars.length - 1; index >= 0; index--) {
    const info = virtualBars[index];
    const frame = barFrames[index];

    // Quick bounding box check
    if (
      x < frame.x - maxRadius ||
      x > frame.x + frame.width + maxRadius ||
      y < frame.y - maxRadius ||
      y > frame.y + frame.height + maxRadius
    ) {
      continue;
    }

    const barX = frame.x;
    let barY = frame.y;

    let targetChart = chart;
    let currentBranch: BranchName | undefined = chart.branchType;
    const params = chart.barParams[info.originalIndex];
    const isBranchedBar = isAllBranches && params && params.isBranched;

    if (isBranchedBar && chart.branches) {
      const layout = activeLayout.branchLayouts[index];
      let found = false;
      const branches: BranchName[] = [BranchName.Normal, BranchName.Expert, BranchName.Master];

      for (const b of branches) {
        const branchInfo = layout.branches[b];
        if (branchInfo?.visible) {
          const branchY = frame.y + branchInfo.offsetY;
          const branchHeight = activeLayout.constants.barHeight;

          if (y >= branchY && y < branchY + branchHeight) {
            targetChart = chart.branches[b] || chart;
            currentBranch = b;
            barY = branchY;
            found = true;
            break;
          }
        }
      }
      if (!found) continue;
    }

    const centerY = barY + (isBranchedBar ? activeLayout.constants.barHeight : frame.height) / 2;

    const bar = targetChart.bars[info.originalIndex];
    if (!bar || bar.length === 0) continue;

    const noteStep: number = frame.width / bar.length;

    for (let i = 0; i < bar.length; i++) {
      const char = bar[i];
      if (!isRenderable(char)) continue;
      // Skip discrete hit testing for End notes to allow long note segment logic to handle them (mapping to head)
      if (char === NoteType.End) continue;

      const noteX: number = barX + i * noteStep;

      // Check distance
      const dx = x - noteX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Determine radius
      let radius = NOTE_RADIUS_SMALL;
      if (isBig(char)) radius = NOTE_RADIUS_BIG;

      if (dist <= radius) {
        // Hit!
        const currentParams = targetChart.barParams[info.originalIndex];

        const effectiveBpm = currentParams ? getEffectiveBpm(currentParams, i) : undefined;
        const effectiveScroll = currentParams ? getEffectiveScroll(currentParams, i) : undefined;

        const effectiveBarIndex = info.effectiveBarIndex !== undefined ? info.effectiveBarIndex : info.originalIndex;

        let ordinal: number | undefined;
        if (activeLayout.locToJudgementKey) {
          const locKey = { barIndex: effectiveBarIndex, charIndex: i, branch: currentBranch };
          const ident = activeLayout.locToJudgementKey.get(locKey);
          if (ident) ordinal = ident.ordinal;
        }

        return {
          location: { barIndex: info.originalIndex, charIndex: i, branch: currentBranch },
          type: char,
          bpm: effectiveBpm,
          scroll: effectiveScroll,
          ordinal: ordinal,
        };
      }
    }
  }

  if (activeLayout.longNoteSegments) {
    for (const segment of activeLayout.longNoteSegments) {
      // Bounding box check
      const minX = Math.min(segment.startX, segment.endX) - segment.radius;
      const maxX = Math.max(segment.startX, segment.endX) + segment.radius;
      const minY = segment.y - segment.radius;
      const maxY = segment.y + segment.radius;

      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      // Capsule Distance Check
      // Distance from point P(x,y) to line segment AB(startX, y, endX, y)
      // Since y is constant, we just clamp x.
      const clampedX = Math.max(
        Math.min(x, Math.max(segment.startX, segment.endX)),
        Math.min(segment.startX, segment.endX),
      );
      const dx = x - clampedX;
      const dy = y - segment.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= segment.radius) {
        // Hit!
        // We need to fetch additional info (bpm, scroll) for the start note
        const originalBarIdx = segment.originalBarIndex;
        const charIdx = segment.startNoteIndex;

        // Find effective params
        const currentParams = chart.barParams[originalBarIdx];
        const effectiveBpm = currentParams ? getEffectiveBpm(currentParams, charIdx) : undefined;
        const effectiveScroll = currentParams ? getEffectiveScroll(currentParams, charIdx) : undefined;

        let ordinal: number | undefined;
        if (activeLayout.locToJudgementKey) {
          const locKey = { barIndex: originalBarIdx, charIndex: charIdx, branch: chart.branchType };
          const ident = activeLayout.locToJudgementKey.get(locKey);
          if (ident) ordinal = ident.ordinal;
        }

        return {
          location: { barIndex: originalBarIdx, charIndex: charIdx, branch: chart.branchType },
          type: segment.type,
          bpm: effectiveBpm,
          scroll: effectiveScroll,
          // Note: In showAllBranches mode, segments are currently only calculated for the root chart (usually normal branch).
          // Hit testing for other branches' long notes is a known limitation.
          ordinal: ordinal,
        };
      }
    }
  }

  return null;
}

export function getChartElementAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue>,
  options: RenderOptions,
  layout?: ChartLayout,
): HitInfo | null {
  const noteHit = getNoteAt(x, y, chart, canvas, judgements, options, layout);
  if (noteHit) return noteHit;

  const branchHit = getBranchLineAt(x, y, chart, canvas, options, layout);
  if (branchHit) return branchHit;

  return null;
}

export function getNotePosition(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: RenderOptions,
  targetBarIndex: number,
  targetCharIndex: number,
  layout?: ChartLayout,
): { x: number; y: number } | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    // For getNotePosition we don't need judgements really, pass empty
    const logicalWidth = resolveCanvasWidth(canvas);
    const dpr = window.devicePixelRatio || 1;
    activeLayout = createLayout(chart, logicalWidth, options, new JudgementMap(), dpr);
  }

  const { barFrames, virtualBars } = activeLayout;

  for (let index = 0; index < virtualBars.length; index++) {
    const info = virtualBars[index];
    if (info.originalIndex === targetBarIndex) {
      const frame = barFrames[index];
      const bar = info.bar;
      if (!bar || bar.length === 0) return null;

      const noteStep = frame.width / bar.length;
      const x = frame.x + targetCharIndex * noteStep;

      let y = frame.y + frame.height / 2;

      if (!!options.showAllBranches && chart.branches && chart.barParams[info.originalIndex].isBranched) {
        const layout = activeLayout.branchLayouts[index];
        let branchY = frame.y;

        if (layout.branches.normal?.visible) {
          branchY += layout.branches.normal.offsetY;
        } else if (layout.branches.expert?.visible) {
          branchY += layout.branches.expert.offsetY;
        } else if (layout.branches.master?.visible) {
          branchY += layout.branches.master.offsetY;
        }

        y = branchY + activeLayout.constants.barHeight / 2;
      }

      return { x, y };
    }
  }
  return null;
}
