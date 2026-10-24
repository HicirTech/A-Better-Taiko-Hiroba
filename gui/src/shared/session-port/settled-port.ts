import { err } from "@abth/core";

import type { PipelineView } from "../pipelines/pipeline-view";
import { settled } from "../settled";
import type { HirobaSessionPort } from "./types";

type FailedCallAnswers = {
  readonly [V in keyof HirobaSessionPort]: (
    ...args: Parameters<HirobaSessionPort[V]>
  ) => Awaited<ReturnType<HirobaSessionPort[V]>>;
};

const READ_FAILED = err({ kind: "callFailed" } as const);
const FETCH_FAILED = err({ code: "callFailed" } as const);
const INTERRUPTED = { kind: "interrupted" } as const;
const NO_GROUPS: PipelineView = { running: [], waiting: [], ended: [] };

/** What each verb answers when its call itself fails, so no caller waits on a rejection. */
export const FAILED_CALL_ANSWERS: FailedCallAnswers = {
  isSignedIn: () => false,
  signIn: () => ({ kind: "unavailable" }),
  cancelSignIn: () => undefined,
  readProfile: () => READ_FAILED,
  refreshHiroba: () => READ_FAILED,
  signOut: () => undefined,
  openCostumeEditor: () => READ_FAILED,
  openTitleEditor: () => READ_FAILED,
  previewCostume: () => err({ code: "preview=callFailed" }),
  readPicture: (want) => err({ code: `${want.kind}=callFailed` }),
  changeCostume: () => INTERRUPTED,
  changeTitle: () => INTERRUPTED,
  changeName: () => INTERRUPTED,
  costumeHistory: () => [],
  readUpdateFeed: () => FETCH_FAILED,
  openFavorites: () => READ_FAILED,
  changeFolder: () => INTERRUPTED,
  changeFavoriteSong: () => INTERRUPTED,
  readSongPicker: () => READ_FAILED,
  recentPlays: () => [],
  readRecentPlays: () => READ_FAILED,
  readEveryRecentPlay: () => READ_FAILED,
  recentPlaysProgress: () => null,
  scores: () => ({ scores: [], unread: 0, songs: [] }),
  listedCharts: () => ({ charts: [], songs: [] }),
  readScores: () => READ_FAILED,
  readEveryScore: () => READ_FAILED,
  readSongScores: () => READ_FAILED,
  scoresProgress: () => null,
  readSongCatalogue: () => FETCH_FAILED,
  readChineseNames: () => FETCH_FAILED,
  readRatingData: () => FETCH_FAILED,
  readChartPicture: () => err({ code: "chart=callFailed" }),
  readChartDensity: () => FETCH_FAILED,
  readChartTja: () => FETCH_FAILED,
  readDrawnChart: () => null,
  keepDrawnChart: () => undefined,
  readPipelines: () => ({
    io: NO_GROUPS,
    pictures: NO_GROUPS,
    history: NO_GROUPS,
    scores: NO_GROUPS,
    external: NO_GROUPS,
  }),
};

/** The port with every call that rejects or throws answered as `FAILED_CALL_ANSWERS` says. */
export function settledPort(port: HirobaSessionPort): HirobaSessionPort {
  const answered: Partial<
    Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>
  > = {};
  for (const verb of Object.keys(FAILED_CALL_ANSWERS) as (keyof HirobaSessionPort)[]) {
    const call = port[verb] as (...args: unknown[]) => Promise<unknown>;
    const failed = FAILED_CALL_ANSWERS[verb] as (...args: unknown[]) => unknown;
    answered[verb] = (...args) =>
      settled(
        () => call(...args),
        () => failed(...args),
      );
  }
  return answered as HirobaSessionPort;
}
