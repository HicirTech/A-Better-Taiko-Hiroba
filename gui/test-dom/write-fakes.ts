import type { SaveReading } from "@abth/core";

import type { PictureLane } from "../src/pictures/picture-lane";
import {
  type HirobaSessionPort,
  type PictureWant,
  PORT_ARGUMENTS,
} from "../src/shared/session-port";

export const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };

const VERBS = Object.keys(PORT_ARGUMENTS) as (keyof HirobaSessionPort)[];

/** A port that answers the calls given and refuses any other, which no test expects. */
export function portAnswering(calls: Partial<HirobaSessionPort>): HirobaSessionPort {
  const refused = Object.fromEntries(
    VERBS.map((verb) => [verb, () => Promise.reject(new Error(`${verb} was not expected`))]),
  );
  return { ...refused, ...calls } as HirobaSessionPort;
}

/** A port call that waits until the test answers it, the oldest call first. */
export function answeredByHand<R>() {
  const waiting: ((result: R) => void)[] = [];
  let made = 0;
  return {
    call: () => {
      made += 1;
      return new Promise<R>((answer) => {
        waiting.push(answer);
      });
    },
    made: () => made,
    answer: (result: R) => {
      const oldest = waiting.shift();
      if (oldest === undefined) {
        throw new Error("No call waits for an answer");
      }
      oldest(result);
    },
  };
}

/** A port call that answers at once, counting how often it was made. */
export function counted<R>(result: R) {
  let made = 0;
  return {
    call: () => {
      made += 1;
      return Promise.resolve(result);
    },
    made: () => made,
  };
}

/** A picture lane that counts the holds a write leaves on it and the pictures renewed. */
export function writeLane() {
  let held = 0;
  const renewed: PictureWant["kind"][] = [];
  const lane: PictureLane = {
    peek: () => undefined,
    settled: () => false,
    ask: () => () => undefined,
    hold: () => {
      held += 1;
    },
    release: () => {
      held -= 1;
    },
    forgetFailures: () => undefined,
    renew: (kind) => {
      renewed.push(kind);
    },
    readAgain: () => undefined,
    readAgainEnded: () => null,
    forget: () => undefined,
    subscribe: () => () => undefined,
    version: () => 0,
  };
  return { lane, held: () => held, renewed };
}
