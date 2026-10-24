import { err, type OurTaikoV1Data, ok, type RatingSystem } from "@abth/core";
import { useCallback, useRef, useState } from "react";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort } from "../shared/session-port";
import type { SongCatalogueFailure } from "../shared/song-catalogue";
import { keepRatingData, loadRatingData } from "./rating-data-cache";

const SYSTEM: RatingSystem = "ourtaikoV1";

type RatingDataFailure = SongCatalogueFailure["code"];

export interface RatingDataState {
  /** The data last read; null until some is. */
  readonly data: OurTaikoV1Data | null;
  /** Where the read of the data stands. */
  readonly status: ReadStatus<RatingDataFailure, never>;
  readonly reading: boolean;
  readonly failure: RatingDataFailure | null;
  /** Brings the data kept on the device unless it is held, and reads it when none is kept. */
  readonly load: () => void;
  /** Reads the data again: every refresh asks, as a system's constants change. */
  readonly read: () => Promise<void>;
}

/** The rating data the page computes with: kept on the device, read again on each refresh. */
export function useRatingData(port: Pick<HirobaSessionPort, "readRatingData">): RatingDataState {
  const [data, setData] = useState<OurTaikoV1Data | null>(null);
  const [reads, status] = useReadRun<RatingDataFailure>();
  // The data held is the device's copy: a read that keeps new data holds it too.
  const held = useRef<OurTaikoV1Data | null>(null);

  const read = useCallback(async () => {
    await reads.run(
      async () => {
        const result = await port.readRatingData(SYSTEM);
        if (!result.ok) {
          return err(result.error.code);
        }
        const parsed = ratingDataOf(result.value.text);
        return parsed === null ? err("badAnswer") : ok({ read: result.value, parsed });
      },
      {
        keep: (result) => {
          if (result.ok) {
            keepRatingData(SYSTEM, result.value.read);
            held.current = result.value.parsed;
            setData(result.value.parsed);
          }
        },
      },
    );
  }, [reads, port]);

  const load = useCallback(() => {
    if (held.current !== null) {
      return;
    }
    const kept = loadRatingData(SYSTEM);
    const keptData = kept === null ? null : ratingDataOf(kept.text);
    held.current = keptData;
    setData(keptData);
    if (keptData === null) {
      void read();
    }
  }, [read]);

  return {
    data,
    status,
    reading: status.phase === "reading",
    failure: status.failure,
    load,
    read,
  };
}
