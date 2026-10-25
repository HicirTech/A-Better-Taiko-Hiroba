import type { PictureLane } from "../pictures/picture-lane";
import type { PictureWant } from "../shared/session-port";

export interface SnapshotLane {
  /** `lane` drawn off the window: every picture asked for at once, and noted. */
  readonly lane: PictureLane;
  /** Settles once every picture asked so far has come or failed, or after `ms` whatever came. */
  readonly allCome: (ms: number) => Promise<void>;
}

/** A snapshot's way to `lane`: its pictures asked for at once, so it is taken once they are in. */
export function snapshotLane(lane: PictureLane): SnapshotLane {
  const asked: PictureWant[] = [];
  const came = () => asked.every((want) => lane.settled(want));
  return {
    lane: {
      offTheWindow: true,
      peek: (want) => lane.peek(want),
      settled: (want) => lane.settled(want),
      ask: (want, options) => {
        asked.push(want);
        return lane.ask(want, options);
      },
      hold: () => lane.hold(),
      release: () => lane.release(),
      forgetFailures: (kind) => lane.forgetFailures(kind),
      renew: (kind) => lane.renew(kind),
      forget: () => lane.forget(),
      subscribe: (listener) => lane.subscribe(listener),
      version: () => lane.version(),
    },
    allCome: (ms) =>
      new Promise((resolve) => {
        let stop = () => {};
        const end = () => {
          clearTimeout(timer);
          stop();
          resolve();
        };
        const timer = setTimeout(end, ms);
        stop = lane.subscribe(() => {
          if (came()) {
            end();
          }
        });
        if (came()) {
          end();
        }
      }),
  };
}
