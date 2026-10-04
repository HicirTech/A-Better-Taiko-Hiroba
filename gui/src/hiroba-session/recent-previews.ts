import { ok, sameCostume } from "@abth/core";

import type { CostumeSet, HirobaSessionPort } from "../session-port";

/** Enough for the sets one editing session tries before a save. */
const MAX_RECENT_PREVIEWS = 16;

type PreviewCostume = HirobaSessionPort["previewCostume"];
type Kept = { readonly set: CostumeSet; readonly picture: string };

/** The pictures of Hiroba's last previews, held in memory for one session, to date a history's
 * entries with the picture of the set they were worn in. */
export interface RecentPreviews {
  /** `preview` as the shell serves it: a picture held comes from memory, a new one is kept. */
  keeping(preview: PreviewCostume): PreviewCostume;
  /** The picture of exactly this set, if one came lately or it is the set worn. */
  pictureOf(set: CostumeSet): string | null;
  /** The set worn now: its picture outlasts any number of later previews. */
  wear(set: CostumeSet): void;
  /** Forgets every picture, and any still on its way, when the session ends. */
  clear(): void;
}

/** `onKept` hears of each picture newly kept, to fill a history entry that has none. */
export function createRecentPreviews(
  onKept: (set: CostumeSet, picture: string) => void = () => undefined,
): RecentPreviews {
  let recent: Kept[] = [];
  let worn: { readonly set: CostumeSet; picture: string | null } | null = null;
  let generation = 0;
  const held = (set: CostumeSet) =>
    (worn !== null && sameCostume(worn.set, set) ? worn.picture : null) ??
    recent.find((one) => sameCostume(one.set, set))?.picture ??
    null;
  return {
    keeping: (preview) => async (set) => {
      const picture = held(set);
      if (picture !== null) {
        return ok(picture);
      }
      const mine = generation;
      const answer = await preview(set);
      if (answer.ok && mine === generation) {
        recent = [{ set, picture: answer.value }, ...recent].slice(0, MAX_RECENT_PREVIEWS);
        if (worn !== null && sameCostume(worn.set, set)) {
          worn.picture = answer.value;
        }
        onKept(set, answer.value);
      }
      return answer;
    },
    pictureOf: held,
    wear(set) {
      worn = { set, picture: held(set) };
    },
    clear() {
      generation += 1;
      recent = [];
      worn = null;
    },
  };
}
