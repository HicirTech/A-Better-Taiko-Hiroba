import { err, ok, type RatingData, type RatingSystem } from "@abth/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort } from "../shared/session-port";
import type { SongCatalogueFailure } from "../shared/song-catalogue";
import { keepRatingData, loadRatingData } from "./rating-data-cache";

type RatingDataFailure = SongCatalogueFailure["code"];
type RatingDataPort = Pick<HirobaSessionPort, "readRatingData">;

export interface RatingDataState {
  /** The rating shown: Settings' default as Rating opens, the page's switch after. */
  readonly system: RatingSystem;
  /** The shown rating's data last read; null until some is. */
  readonly data: RatingData | null;
  /** Where the read of the shown rating's data stands. */
  readonly status: ReadStatus<RatingDataFailure, never>;
  readonly reading: boolean;
  readonly failure: RatingDataFailure | null;
  /** Shows the default rating, its data brought from the device unless held, read when none is. */
  readonly load: () => void;
  /** Shows another rating for the visit, its data brought as `load` brings it. */
  readonly show: (system: RatingSystem) => void;
  /** Reads the shown rating's data again: every refresh asks, as a system's constants change. */
  readonly read: () => Promise<void>;
}

/** The data each rating computes with: kept on the device, read again on each refresh. */
export function useRatingData(port: RatingDataPort, startingRating: RatingSystem): RatingDataState {
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
  const load = useCallback(() => show(startingRating), [show, startingRating]);

  return {
    system,
    data: shown.data,
    status: shown.status,
    reading: shown.status.phase === "reading",
    failure: shown.status.failure,
    load,
    show,
    read: shown.read,
  };
}

interface SystemData {
  readonly data: RatingData | null;
  readonly status: ReadStatus<RatingDataFailure, never>;
  readonly load: () => void;
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

  const load = useCallback(() => {
    if (held.current !== null) {
      return;
    }
    const kept = loadRatingData(system);
    const keptData = kept === null ? null : ratingDataOf(system, kept.text);
    held.current = keptData;
    setData(keptData);
    if (keptData === null) {
      void read();
    }
  }, [read, system]);

  return { data, status, load, read };
}
