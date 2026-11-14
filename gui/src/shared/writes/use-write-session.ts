import { type RefObject, useMemo, useRef } from "react";

import type { WriteOutcomeView } from "../session-port";
import { type HeldLane, sendHeld } from "./write-ending";

export interface WriteSession {
  /** Grows as the session ends or begins: an answer asked for under an older count is let go. */
  readonly generation: RefObject<number>;
  /** Lets go of every answer on its way. */
  bump(): void;
  /** Whether a write is on its way: one at a time, and no read while it runs. */
  writing(): boolean;
  /** Sends a write with the picture lane held: how it ended, or null once let go on its way. */
  send<S>(call: () => Promise<WriteOutcomeView<S>>): Promise<WriteOutcomeView<S> | null>;
}

/** What the editors' writes share: the count that lets late answers go, and one write at a time. */
export function useWriteSession(lane: HeldLane): WriteSession {
  const generation = useRef(0);
  const writing = useRef(false);
  return useMemo(
    (): WriteSession => ({
      generation,
      bump: () => {
        generation.current += 1;
      },
      writing: () => writing.current,
      send: async (call) => {
        writing.current = true;
        const mine = generation.current;
        const outcome = await sendHeld(lane, call);
        writing.current = false;
        return mine === generation.current ? outcome : null;
      },
    }),
    [lane],
  );
}
