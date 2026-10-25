import { type ReactNode, useRef, useState } from "react";

import type { PageData, PageEntry } from "../pages/page";
import { useReadAgainKeys } from "../read-again/use-read-again-keys";
import { scoresReadingText } from "../songs/scores-reading";

/** Read again on the page shown: the button's state, its read, and a hold's question. */
export interface ReadAgain {
  readonly signedIn: boolean;
  readonly canRead: boolean;
  /** What the button turns for: my page's read, or the read the page follows. */
  readonly reading: boolean;
  /** How far a long read has come, said at the navigation's foot. */
  readonly progress: string | null;
  readonly read: () => Promise<void>;
  /** Asks to read all of the page's data again, where the page can and keeps some. */
  readonly askEvery: (() => void) | undefined;
  /** That read's question, while the page has one. */
  readonly question: ReactNode;
}

/** Read again by the button, its keys or a pull: what the page shown reads, once at a time. */
export function useReadAgain(entry: PageEntry, data: PageData): ReadAgain {
  const { session, writing, catalogue, scores, i18n } = data;
  const { screen } = session;
  const profileShown = screen.name === "profile";
  const signedIn = profileShown || screen.name === "readFailed";
  const myPageReading = session.myPage.phase === "reading";
  const following = profileShown ? (entry.follows?.(data) ?? null) : null;
  const canRead =
    signedIn && !writing && !myPageReading && (following === null || following.canRead);
  // Turns away a second ask, by the button or a key, that lands before the button is shut.
  const started = useRef(false);
  const read = async () => {
    if (!canRead || started.current) {
      return;
    }
    started.current = true;
    try {
      if (entry.namesSongs) {
        catalogue.readIfStale();
      }
      // With my page unread, every page waits on it, so it alone is read.
      await (profileShown ? entry.readAgain(data) : session.read(false, true));
    } finally {
      started.current = false;
    }
  };
  useReadAgainKeys(signedIn, read);
  // Reading all of a page's data again takes minutes, so the page asks for it by a long hold.
  const every = profileShown ? (entry.readsEvery ?? null) : null;
  const ask = every === null ? undefined : entry.askEvery;
  const [asking, setAsking] = useState(false);
  if (asking && ask === undefined) {
    setAsking(false);
  }
  return {
    signedIn,
    canRead,
    reading: myPageReading || (following?.reading ?? false),
    progress: scores.reading ? scoresReadingText(i18n, scores.progress, scores.song) : null,
    read,
    askEvery: ask !== undefined && every?.can(data) === true ? () => setAsking(true) : undefined,
    question:
      every === null || ask === undefined
        ? null
        : ask(data, asking, (confirmed) => {
            setAsking(false);
            if (confirmed) {
              void every.read(data);
            }
          }),
  };
}
