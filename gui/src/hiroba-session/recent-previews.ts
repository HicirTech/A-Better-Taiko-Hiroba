import { sameCostume } from "@abth/core";

import type { CostumeSet, HirobaSessionPort } from "../session-port";

/** Enough for the sets one editing session wears and leaves. */
const MAX_RECENT_PREVIEWS = 8;

type PreviewCostume = HirobaSessionPort["previewCostume"];

/** The pictures of Hiroba's last previews, held in memory for one session, to date a history's
 * entries with the picture of the set they were worn in. */
export interface RecentPreviews {
  /** `preview` as the shell serves it, keeping each good picture it gets. */
  keeping(preview: PreviewCostume): PreviewCostume;
  /** The picture of exactly this set, if one came lately. */
  pictureOf(set: CostumeSet): string | null;
  /** Forgets every picture, and any still on its way, when the session ends. */
  clear(): void;
}

export function createRecentPreviews(): RecentPreviews {
  let recent: { readonly set: CostumeSet; readonly picture: string }[] = [];
  let generation = 0;
  return {
    keeping: (preview) => async (set) => {
      const mine = generation;
      const answer = await preview(set);
      if (answer.ok && mine === generation) {
        const others = recent.filter((one) => !sameCostume(one.set, set));
        recent = [{ set, picture: answer.value }, ...others].slice(0, MAX_RECENT_PREVIEWS);
      }
      return answer;
    },
    pictureOf: (set) => recent.find((one) => sameCostume(one.set, set))?.picture ?? null,
    clear() {
      generation += 1;
      recent = [];
    },
  };
}
