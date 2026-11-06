import { err, ok, type RatingData, type RatingSnapshot, type RatingSystem } from "@abth/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort, ScoresView } from "../shared/session-port";
import type { SongCatalogueFailure } from "../shared/song-catalogue";
import { keepRatingData, loadRatingData } from "./rating-data-cache";
import { useRatingHistory } from "./use-rating-history";

type RatingDataFailure = SongCatalogueFailure["code"];
type RatingDataPort = Pick<HirobaSessionPort, "readRatingData" | "ratingHistory" | "keepRating">;

export interface RatingDataState {
  /** The rating shown: Settings' default as Rating opens, the page's switch after. */
  readonly system: RatingSystem;
  /** The shown rating's data last read; null until some is. */
  readonly data: RatingData | null;
  /** Where the read of the shown rating's data stands. */
  readonly status: ReadStatus<RatingDataFailure, never>;
  readonly reading: boolean;
  readonly failure: RatingDataFailure | null;
  /** The shown rating's kept changes, oldest first. */
  readonly history: readonly RatingSnapshot[];
  /** Shows the default rating; each system's data is brought from the device, read when none is. */
  readonly load: () => void;
  /** Shows another rating for the visit, its data brought as `load` brings it. */
  readonly show: (system: RatingSystem) => void;
  /** Reads the shown rating's data again: every refresh asks, as a system's constants change. */
  readonly read: () => Promise<void>;
}

/** The data each rating computes with: kept on the device, read again on each refresh. */
export function useRatingData(
  port: RatingDataPort,
  startingRating: RatingSystem,
  /** The kept scores, as each rating that has its data is kept. */
  scores: { readonly view: ScoresView | null; readonly reading: boolean },
): RatingDataState {
  const v1 = useSystemData(port, "ourtaikoV1");
  const v2 = useSystemData(port, "ourtaikoV2");
  const [system, setSystem] = useState(startingRating);
  const shown = { ourtaikoV1: v1, ourtaikoV2: v2 }[system];
  const loads = useMemo(() => ({ ourtaikoV1: v1.load, ourtaikoV2: v2.load }), [v1.load, v2.load]);

  const show = useCallback(
    (next: RatingSystem) => {
      setSystem(next);
      loads[next]();
    },
    [loads],
  );
  const load = useCallback(() => {
    setSystem(startingRating);
    loads.ourtaikoV1();
    loads.ourtaikoV2();
  }, [startingRating, loads]);

  // A read of scores anywhere keeps the ratings: the device's data comes in as one ends.
  const { reading: readingScores } = scores;
  const { bring: bringV1 } = v1;
  const { bring: bringV2 } = v2;
  const wasReading = useRef(false);
  useEffect(() => {
    if (wasReading.current && !readingScores) {
      bringV1();
      bringV2();
    }
    wasReading.current = readingScores;
  }, [readingScores, bringV1, bringV2]);
  const history = useRatingHistory(port, scores.view, readingScores, {
    ourtaikoV1: v1.data,
    ourtaikoV2: v2.data,
  });

  return {
    system,
    data: shown.data,
    status: shown.status,
    reading: shown.status.phase === "reading",
    failure: shown.status.failure,
    history: history[system],
    load,
    show,
    read: shown.read,
  };
}

interface SystemData {
  readonly data: RatingData | null;
  readonly status: ReadStatus<RatingDataFailure, never>;
  readonly load: () => void;
  /** Brings the device's copy unless held, reading nothing. */
  readonly bring: () => boolean;
  readonly read: () => Promise<void>;
}

/** One system's data: the device's copy, and its reads. */
function useSystemData(port: RatingDataPort, system: RatingSystem): SystemData {
  const [data, setData] = useState<RatingData | null>(null);
  const [reads, status] = useReadRun<RatingDataFailure>({ callFailed: "callFailed" });
  // The data held is the device's copy: a read that keeps new data holds it too.
  const held = useRef<RatingData | null>(null);

  const read = useCallback(async () => {
    await reads.run(
      async () => {
        const result = await port.readRatingData(system);
        if (!result.ok) {
          return err(result.error.code);
        }
        const parsed = ratingDataOf(system, result.value.text);
        return parsed === null ? err("badAnswer") : ok({ read: result.value, parsed });
      },
      {
        keep: (result) => {
          if (result.ok) {
            keepRatingData(system, result.value.read);
            held.current = result.value.parsed;
            setData(result.value.parsed);
          }
        },
      },
    );
  }, [reads, port, system]);

  const bring = useCallback(() => {
    if (held.current !== null) {
      return true;
    }
    const kept = loadRatingData(system);
    const keptData = kept === null ? null : ratingDataOf(system, kept.text);
    held.current = keptData;
    setData(keptData);
    return keptData !== null;
  }, [system]);

  const load = useCallback(() => {
    if (!bring()) {
      void read();
    }
  }, [bring, read]);

  return { data, status, load, bring, read };
}
