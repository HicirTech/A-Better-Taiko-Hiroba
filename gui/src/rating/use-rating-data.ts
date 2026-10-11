import type { OurTaikoV1Data, RatingSystem } from "@abth/core";
import { useCallback, useRef, useState } from "react";

import type { HirobaSessionPort } from "../session-port";
import type { SongCatalogueFailure } from "../song-catalogue";
import { keepRatingData, loadRatingData } from "./rating-data-cache";
import { ratingDataOf } from "./read-rating-data";

const SYSTEM: RatingSystem = "ourtaikoV1";

export interface RatingDataState {
  /** The data last read; null until some is. */
  readonly data: OurTaikoV1Data | null;
  readonly reading: boolean;
  readonly failure: SongCatalogueFailure["code"] | null;
  /** Brings the data kept on the device, and reads it when none is: the page asks as it opens. */
  readonly load: () => void;
  /** Reads the data again: every refresh asks, as a system's constants change. */
  readonly read: () => Promise<void>;
}

/** The rating data the page computes with: kept on the device, read again on each refresh. */
export function useRatingData(port: Pick<HirobaSessionPort, "readRatingData">): RatingDataState {
  const [data, setData] = useState<OurTaikoV1Data | null>(null);
  const [reading, setReading] = useState(false);
  const [failure, setFailure] = useState<SongCatalogueFailure["code"] | null>(null);
  const running = useRef(false);

  const read = useCallback(async () => {
    if (running.current) {
      return;
    }
    running.current = true;
    setReading(true);
    setFailure(null);
    const result = await port.readRatingData(SYSTEM);
    const parsed = result.ok ? ratingDataOf(result.value.text) : null;
    if (result.ok && parsed !== null) {
      keepRatingData(SYSTEM, result.value);
      setData(parsed);
    } else {
      setFailure(result.ok ? "badAnswer" : result.error.code);
    }
    running.current = false;
    setReading(false);
  }, [port]);

  const load = useCallback(() => {
    const kept = loadRatingData(SYSTEM);
    const keptData = kept === null ? null : ratingDataOf(kept.text);
    setData(keptData);
    if (keptData === null) {
      void read();
    }
  }, [read]);

  return { data, reading, failure, load, read };
}
