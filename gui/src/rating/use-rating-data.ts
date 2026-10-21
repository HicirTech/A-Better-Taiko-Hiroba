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
  /** Brings the data kept on the device unless it is held, and reads it when none is kept. */
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
  // The data held is the device's copy: a read that keeps new data holds it too.
  const held = useRef<OurTaikoV1Data | null>(null);

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
      held.current = parsed;
      setData(parsed);
    } else {
      setFailure(result.ok ? "badAnswer" : result.error.code);
    }
    running.current = false;
    setReading(false);
  }, [port]);

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

  return { data, reading, failure, load, read };
}
