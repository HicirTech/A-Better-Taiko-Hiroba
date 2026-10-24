import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort } from "../shared/session-port";
import type {
  CatalogueSong,
  ChineseNamesRead,
  SongCatalogueFailure,
} from "../shared/song-catalogue/types";
import {
  type KeptCatalogue,
  keepCatalogue,
  loadCatalogue,
  mergeCatalogue,
  nextCatalogueRead,
} from "./catalogue-cache";
import {
  CHINESE_NAMES_MAX_AGE_MS,
  chineseNamesBySong,
  keepChineseNames,
  loadChineseNames,
} from "./chinese-names";

/** A song with the Chinese wiki's names for it, none until they are read. */
export type ListedSong = CatalogueSong & { readonly chineseNames: readonly string[] };

export interface SongCatalogue {
  readonly songs: ReadonlyMap<string, ListedSong>;
  readonly list: readonly ListedSong[];
  /** Where the read of the list stands; a failure with a list kept goes unsaid. */
  readonly status: ReadStatus<SongCatalogueFailure, never>;
  /** `failed` only when no song list is kept to use; a kept one is used without a word. */
  readonly state: "loading" | "ready" | "failed";
  readonly failure: SongCatalogueFailure["code"] | null;
  /** Reads the list again if the last read failed with none kept: as a part that needs it opens. */
  readIfFailed(): void;
  /** Reads the list again if the one kept is a day old, as Read again does on a page of songs. */
  readIfStale(): void;
}

const NONE: readonly CatalogueSong[] = [];

/** The song list kept on the device, read again from taiko.wiki when it is a day old, with the
 * Chinese wiki's names, read again when they are a month old. */
export function useSongCatalogue(port: HirobaSessionPort, needed: boolean): SongCatalogue {
  const [kept, setKept] = useState<KeptCatalogue | null>(null);
  const [names, setNames] = useState<ChineseNamesRead | null>(null);
  const [reads, status] = useReadRun<SongCatalogueFailure>();
  const [nameReads] = useReadRun<SongCatalogueFailure>();
  const started = useRef(false);
  // The list kept, for the callbacks that must not change with it.
  const keptNow = useRef<KeptCatalogue | null>(null);

  const refresh = useCallback(
    async (known: KeptCatalogue | null) => {
      const ask = nextCatalogueRead(known, Date.now());
      if (ask === null) {
        return;
      }
      await reads.run(() => port.readSongCatalogue(ask.since), {
        keep: (result) => {
          if (result.ok) {
            const merged = mergeCatalogue(known, result.value);
            keepCatalogue(merged);
            keptNow.current = merged;
            setKept(merged);
          }
        },
      });
    },
    [reads, port],
  );

  // The names only add to what search finds and what Chinese shows, so a failure says nothing.
  const refreshNames = useCallback(
    async (known: ChineseNamesRead | null) => {
      if (known !== null && Date.now() - known.sentAt <= CHINESE_NAMES_MAX_AGE_MS) {
        return;
      }
      await nameReads.run(() => port.readChineseNames(), {
        keep: (result) => {
          if (result.ok) {
            keepChineseNames(result.value);
            setNames(result.value);
          }
        },
      });
    },
    [nameReads, port],
  );

  useEffect(() => {
    if (!needed || started.current) {
      return;
    }

    started.current = true;
    const cached = loadCatalogue();
    const cachedNames = loadChineseNames();
    keptNow.current = cached;
    setKept(cached);
    setNames(cachedNames);
    void refresh(cached).then(() => refreshNames(cachedNames));
  }, [needed, refresh, refreshNames]);

  const readIfFailed = useCallback(() => {
    if (keptNow.current === null && reads.status().phase === "failed") {
      void refresh(null);
    }
  }, [reads, refresh]);

  const readIfStale = useCallback(() => {
    if (started.current) {
      void refresh(keptNow.current);
    }
  }, [refresh]);

  const known = kept?.songs ?? NONE;
  const list = useMemo(() => {
    const named = chineseNamesBySong(known, names?.pages ?? []);
    return known.map((song) => ({ ...song, chineseNames: named.get(song.songNo) ?? [] }));
  }, [known, names]);
  const songs = useMemo(() => new Map(list.map((song) => [song.songNo, song])), [list]);
  return {
    songs,
    list,
    status,
    state: kept !== null ? "ready" : status.phase === "failed" ? "failed" : "loading",
    failure: kept === null ? (status.failure?.code ?? null) : null,
    readIfFailed,
    readIfStale,
  };
}
