import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { HirobaSessionPort } from "../session-port";
import type { CatalogueSong, SongCatalogueFailure } from "../song-catalogue/types";
import {
  type KeptCatalogue,
  keepCatalogue,
  loadCatalogue,
  mergeCatalogue,
  nextCatalogueRead,
} from "./catalogue-cache";

export interface SongCatalogue {
  readonly songs: ReadonlyMap<string, CatalogueSong>;
  readonly list: readonly CatalogueSong[];
  /** `failed` only when no song list is kept to use; a kept one is used without a word. */
  readonly state: "loading" | "ready" | "failed";
  readonly failure: SongCatalogueFailure["code"] | null;
  retry(): void;
}

const NONE: readonly CatalogueSong[] = [];

/** The song list kept on the device, read again from taiko.wiki when it is a day old. */
export function useSongCatalogue(port: HirobaSessionPort, needed: boolean): SongCatalogue {
  const [kept, setKept] = useState<KeptCatalogue | null>(null);
  const [failure, setFailure] = useState<SongCatalogueFailure["code"] | null>(null);
  const started = useRef(false);
  const reading = useRef(false);

  const refresh = useCallback(
    async (known: KeptCatalogue | null) => {
      const ask = nextCatalogueRead(known, Date.now());
      if (ask === null || reading.current) {
        return;
      }

      reading.current = true;
      setFailure(null);
      const result = await port.readSongCatalogue(ask.since);
      reading.current = false;
      if (result.ok) {
        const merged = mergeCatalogue(known, result.value);
        keepCatalogue(merged);
        setKept(merged);
      } else if (known === null) {
        setFailure(result.error.code);
      }
    },
    [port],
  );

  useEffect(() => {
    if (!needed || started.current) {
      return;
    }

    started.current = true;
    const cached = loadCatalogue();
    setKept(cached);
    void refresh(cached);
  }, [needed, refresh]);

  const list = kept?.songs ?? NONE;
  const songs = useMemo(() => new Map(list.map((song) => [song.songNo, song])), [list]);
  return {
    songs,
    list,
    state: kept !== null ? "ready" : failure !== null ? "failed" : "loading",
    failure,
    retry: () => void refresh(kept),
  };
}
