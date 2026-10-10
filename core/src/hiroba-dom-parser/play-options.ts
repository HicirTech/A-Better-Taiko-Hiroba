import type { PlayOptions, RandomMode } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

const SPEED_CODES = {
  a10: 1,
  a11: 1.1,
  a12: 1.2,
  a13: 1.3,
  a14: 1.4,
  a15: 1.5,
  a16: 1.6,
  a17: 1.7,
  a18: 1.8,
  a19: 1.9,
  a3: 2,
  a25: 2.5,
  a4: 3,
  a35: 3.5,
  a5: 4,
} as const;
const DORON_CODE = "a1";
const ABEKOBE_CODE = "a2";
const RANDOM_CODES = {
  kimagure: "a6",
  detarame: "a7",
} as const satisfies Record<Exclude<RandomMode, "none">, string>;

type SpeedCode = keyof typeof SPEED_CODES;
/** A code Hiroba draws an option with, as `image/sp/640/status_10_<code>_640.png`. */
export type PlayOptionCode =
  | SpeedCode
  | typeof DORON_CODE
  | typeof ABEKOBE_CODE
  | (typeof RANDOM_CODES)[keyof typeof RANDOM_CODES];

const SPEEDS = Object.keys(SPEED_CODES) as SpeedCode[];
export const PLAY_OPTION_CODES: readonly PlayOptionCode[] = [
  ...SPEEDS,
  DORON_CODE,
  ABEKOBE_CODE,
  ...Object.values(RANDOM_CODES),
];

const isSpeedCode = (code: string): code is SpeedCode => Object.hasOwn(SPEED_CODES, code);

/** Decodes one chart's option images; `supportChart` is null where the page cannot know it. */
export function decodePlayOptions(
  sources: readonly string[],
  supportChart: boolean | null,
  page: string,
  marker: string,
): Result<PlayOptions, ParseFailure> {
  let speed = 1;
  let doron = false;
  let abekobe = false;
  let random: RandomMode = "none";

  for (const src of sources) {
    const code = src.match(/status_10_([a-z0-9]+)_/)?.[1];
    // Unused slots are padded with blank images that carry no code.
    if (code === undefined) {
      continue;
    }
    if (isSpeedCode(code)) {
      speed = SPEED_CODES[code];
    } else if (code === DORON_CODE) {
      doron = true;
    } else if (code === ABEKOBE_CODE) {
      abekobe = true;
    } else if (code === RANDOM_CODES.kimagure) {
      random = "kimagure";
    } else if (code === RANDOM_CODES.detarame) {
      random = "detarame";
    } else {
      return err({ kind: "unreadableValue", page, marker, raw: src });
    }
  }

  return ok({ speed, doron, abekobe, random, supportChart });
}

/** An option a chart was played with, and the code Hiroba draws it with. */
export interface PlayOptionIcon {
  readonly option: "random" | "abekobe" | "doron" | "speed";
  readonly code: PlayOptionCode;
}

/** A chart's options in the page's order: random, abekobe, doron, then a speed but 1. */
export function playOptionIcons(options: PlayOptions): readonly PlayOptionIcon[] {
  const icons: PlayOptionIcon[] = [];
  if (options.random !== "none") {
    icons.push({ option: "random", code: RANDOM_CODES[options.random] });
  }
  if (options.abekobe) {
    icons.push({ option: "abekobe", code: ABEKOBE_CODE });
  }
  if (options.doron) {
    icons.push({ option: "doron", code: DORON_CODE });
  }
  const speed = SPEEDS.find((code) => code !== "a10" && SPEED_CODES[code] === options.speed);
  if (speed !== undefined) {
    icons.push({ option: "speed", code: speed });
  }
  return icons;
}
