// @ts-nocheck: TJA Renderer's own code, written for a laxer tsconfig than this app's.
import {
  type Annotation,
  annotationHand,
  annotationIsRoll,
  HandType,
  JUDGEABLE_NOTES,
  type NoteLocation,
  NoteLocationMap,
  NoteType,
} from "./primitives.js";
import { getEffectiveBpm, type ParsedChart } from "./tja-parser.js";

export interface NoteTiming {
  id: NoteLocation;
  beat: number;
  type: string;
}

export interface Segment {
  notes: NoteTiming[];
  gap: number;
}

export function extractNotesAndSegments(chart: ParsedChart): { notes: NoteTiming[]; segments: Segment[] } {
  const notes: NoteTiming[] = [];
  let currentBeat = 0;

  for (let i = 0; i < chart.bars.length; i++) {
    const bar = chart.bars[i];
    const params = chart.barParams[i];
    const measureRatio = params ? params.measureRatio : 1.0;
    const barLengthBeats = 4 * measureRatio;

    if (bar && bar.length > 0) {
      const step = barLengthBeats / bar.length;
      for (let j = 0; j < bar.length; j++) {
        const char = bar[j];
        if (JUDGEABLE_NOTES.includes(char)) {
          const id = { barIndex: i, charIndex: j, branch: chart.branchType };
          notes.push({ id, beat: currentBeat + j * step, type: char });
        }
      }
    }
    currentBeat += barLengthBeats;
  }

  const segments: Segment[] = [];
  let currentSegment: NoteTiming[] = [];

  for (let k = 0; k < notes.length; k++) {
    const note = notes[k];

    if (currentSegment.length === 0) {
      currentSegment.push(note);
      continue;
    }

    const prev = notes[k - 1];
    const next = notes[k + 1];
    const gapBefore = note.beat - prev.beat;

    if (!next) {
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
      continue;
    }

    const gapAfter = next.beat - note.beat;
    const epsilon = 0.0001;

    if (Math.abs(gapBefore - gapAfter) < epsilon) {
      currentSegment.push(note);
    } else if (gapBefore < gapAfter - epsilon) {
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
    } else if (gapBefore > gapAfter + epsilon) {
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [note];
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ notes: [...currentSegment], gap: Infinity });
  }

  return { notes, segments };
}

/**
 * Decide whether a same-gap segment should be played as a 2-2 roll, and if so which notes
 * are roll (second-of-swing) taps. Returns `null` when rolling does not apply — when it is
 * disabled (either threshold unset), the segment is shorter than the minimum length, or the
 * note spacing is wider than a 16th note at the configured BPM.
 *
 * The returned array is one entry per note: `true` marks the second tap of a swing, which
 * shares its hand with the preceding note and is displayed as "-". Greedy pairing from the
 * start — (0,1)(2,3)… — so a trailing unpaired note (at an even index) is a normal tap.
 */
export function computeRollFlags(
  seg: Segment,
  chart: ParsedChart,
  rollGapThresholdBpm?: number,
  rollMinSegmentLength?: number,
): boolean[] | null {
  if (rollGapThresholdBpm == null || rollMinSegmentLength == null) return null;
  if (seg.notes.length < rollMinSegmentLength) return null;
  if (!Number.isFinite(seg.gap)) return null;

  const first = seg.notes[0].id;
  const params = chart.barParams[first.barIndex];
  const segBpm = params ? getEffectiveBpm(params, first.charIndex) : 0;
  if (!segBpm) return null;

  // `seg.gap` is the spacing in quarter-note beats; a 16th note is 1/4 beat. Compare the
  // segment's spacing in time against a 16th note at the threshold BPM.
  const epsilon = 1e-6;
  const segTimeGap = (seg.gap * 60) / segBpm;
  const sixteenthTime = (0.25 * 60) / rollGapThresholdBpm;
  if (segTimeGap > sixteenthTime + epsilon) return null;

  return seg.notes.map((_, i) => i % 2 === 1);
}

// A roll tap inherits the previous hand, so a user-pinned Roll must not advance the
// alternation chain; treat it like an unannotated note for hand-tracking purposes.
function pinnedHand(annotations: NoteLocationMap<Annotation> | undefined, id: NoteLocation): HandType | undefined {
  const hand = annotationHand(annotations?.get(id));
  return hand === HandType.Roll ? undefined : hand;
}

export function calculateInferredHands(
  chart: ParsedChart,
  annotations: NoteLocationMap<Annotation> | undefined,
  alternationThresholdMeasure: number = Infinity,
  resetThresholdMeasure: number = 0,
  mainHand: HandType = HandType.R,
  rollGapThresholdBpm?: number,
  rollMinSegmentLength?: number,
): NoteLocationMap<HandType> {
  const inferred = new NoteLocationMap<HandType>();

  const alternationThreshold = alternationThresholdMeasure * 4;
  const resetThreshold = resetThresholdMeasure === 0 ? Infinity : resetThresholdMeasure * 4;
  const otherHand = mainHand === HandType.R ? HandType.L : HandType.R;

  const { segments } = extractNotesAndSegments(chart);

  let lastHand: HandType = otherHand; // Ensure the first note gets the main hand
  let currentEndSearchBar = 0;
  let currentEndSearchChar = 0;
  let previousNoteBeat = -Infinity;

  // A note continues a roll when the chart geometry rolls it (rollFlags) or the stored
  // annotation already pins it as a roll. Honouring the annotation keeps this baseline in
  // sync with rolls that geometry alone misses here — e.g. the colouring baseline omits the
  // roll thresholds, and manual rolls may extend beyond the auto-detected 2-2 pattern.
  const isRollTap = (id: NoteLocation, geometryRoll: boolean | undefined): boolean =>
    !!geometryRoll || annotationIsRoll(annotations?.get(id));

  for (const seg of segments) {
    if (seg.notes.length === 0) continue;

    const gapInternal = seg.gap;
    const firstNoteBeat = seg.notes[0].beat;
    const gapBeforeSegment = firstNoteBeat - previousNoteBeat;

    // Check if we passed a NoteType.End before this segment
    let passedEnd = false;
    const firstNoteId = seg.notes[0].id;
    for (let i = currentEndSearchBar; i <= firstNoteId.barIndex; i++) {
      const bar = chart.bars[i];
      if (!bar) continue;
      const startJ = i === currentEndSearchBar ? currentEndSearchChar : 0;
      const endJ = i === firstNoteId.barIndex ? firstNoteId.charIndex : bar.length;
      for (let j = startJ; j < endJ; j++) {
        if (bar[j] === NoteType.End) {
          passedEnd = true;
        }
      }
    }
    currentEndSearchBar = seg.notes[seg.notes.length - 1].id.barIndex;
    currentEndSearchChar = seg.notes[seg.notes.length - 1].id.charIndex;

    const shouldReset = gapBeforeSegment >= resetThreshold - 0.0001 || passedEnd;

    if (gapInternal > alternationThreshold + 0.0001) {
      for (const note of seg.notes) {
        const currentInferred = mainHand;
        inferred.set(note.id, currentInferred);
        lastHand = pinnedHand(annotations, note.id) ?? currentInferred;
      }
    } else if (shouldReset) {
      const rollFlags = computeRollFlags(seg, chart, rollGapThresholdBpm, rollMinSegmentLength);
      let currentInferred = mainHand;
      inferred.set(seg.notes[0].id, currentInferred);
      lastHand = pinnedHand(annotations, seg.notes[0].id) ?? currentInferred;

      for (let i = 1; i < seg.notes.length; i++) {
        const note = seg.notes[i];
        // Within a roll swing the hand does not switch; only non-roll taps alternate.
        currentInferred = isRollTap(note.id, rollFlags?.[i])
          ? lastHand
          : lastHand === HandType.R
            ? HandType.L
            : HandType.R;
        inferred.set(note.id, currentInferred);
        lastHand = pinnedHand(annotations, note.id) ?? currentInferred;
      }
    } else {
      const rollFlags = computeRollFlags(seg, chart, rollGapThresholdBpm, rollMinSegmentLength);
      for (let i = 0; i < seg.notes.length; i++) {
        const note = seg.notes[i];
        const currentInferred: HandType = isRollTap(note.id, rollFlags?.[i])
          ? lastHand
          : lastHand === HandType.R
            ? HandType.L
            : HandType.R;
        inferred.set(note.id, currentInferred);
        lastHand = pinnedHand(annotations, note.id) ?? currentInferred;
      }
    }

    previousNoteBeat = seg.notes[seg.notes.length - 1].beat;
  }

  return inferred;
}

export function generateAutoAnnotations(
  chart: ParsedChart,
  existingAnnotations: NoteLocationMap<Annotation>,
  alternationThresholdMeasure: number = Infinity,
  resetThresholdMeasure: number = 0,
  mode: "full" | "partial" = "partial",
  mainHand: HandType = HandType.R,
  rollGapThresholdBpm?: number,
  rollMinSegmentLength?: number,
): NoteLocationMap<Annotation> {
  const annotations = new NoteLocationMap(existingAnnotations);
  // Auto-annotation explicit placement follows user configuration
  const inferred = calculateInferredHands(
    chart,
    annotations,
    alternationThresholdMeasure,
    resetThresholdMeasure,
    mainHand,
    rollGapThresholdBpm,
    rollMinSegmentLength,
  );
  const { segments } = extractNotesAndSegments(chart);

  const toAnnotate = new NoteLocationMap<boolean>();
  const rollMap = new NoteLocationMap<boolean>();

  // Roll segments are always labeled in full, including the "-" second taps, regardless of
  // the full/partial mode so the rolling pattern is visible end to end.
  for (const seg of segments) {
    const rollFlags = computeRollFlags(seg, chart, rollGapThresholdBpm, rollMinSegmentLength);
    if (!rollFlags) continue;
    for (let i = 0; i < seg.notes.length; i++) {
      toAnnotate.set(seg.notes[i].id, true);
      if (rollFlags[i]) rollMap.set(seg.notes[i].id, true);
    }
  }

  if (mode === "full") {
    for (const seg of segments) {
      for (const note of seg.notes) {
        toAnnotate.set(note.id, true);
      }
    }
  } else {
    for (const seg of segments) {
      if (seg.notes.length === 0) continue;

      const first = seg.notes[0];
      const params = chart.barParams[first.id.barIndex];
      const measureRatio = params ? params.measureRatio : 1.0;
      const quarterNote = measureRatio;

      if (seg.gap < quarterNote - 0.0001) {
        toAnnotate.set(first.id, true);

        const getColor = (c: string) => (c === NoteType.Don || c === NoteType.DonBig ? "d" : "k");

        for (let i = 3; i < seg.notes.length; i++) {
          const current = seg.notes[i];
          const prev1 = seg.notes[i - 1];
          const prev2 = seg.notes[i - 2];
          const prev3 = seg.notes[i - 3];

          const cCurr = getColor(current.type);
          const c1 = getColor(prev1.type);
          const c2 = getColor(prev2.type);
          const c3 = getColor(prev3.type);

          if (c1 === c2 && c2 === c3 && c1 !== cCurr) {
            toAnnotate.set(current.id, true);
          }
        }
      }
    }
  }

  for (const [id] of toAnnotate) {
    const inferredHand = inferred.get(id);
    if (inferredHand) {
      const existing = annotations.get(id);
      const hand = rollMap.get(id) ? HandType.Roll : inferredHand;
      annotations.set(id, { hand, separator: existing?.separator });
    }
  }

  return annotations;
}
