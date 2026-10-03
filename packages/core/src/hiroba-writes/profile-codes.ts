import type { NotAppliedReason, SaveCodes, SaveReading } from "./types";

/** Codes of `change_mydon_profile.php`, from title.js and dialog.js; `refused` varies by script. */
export function profileCodes(refused: readonly number[]): SaveCodes {
  return {
    // 3: saved but the game server not told; counts only when the read-back shows it.
    notSynced: 3,
    reason(save: SaveReading): NotAppliedReason {
      if (save.answer !== "json") {
        return { kind: save.answer };
      }
      switch (save.code) {
        case 0:
          return { kind: "unchanged" };
        case 705:
          return { kind: "stale" };
        case 900:
        case 901:
          return { kind: "siteMaintenance" };
        default:
          return save.code !== null && refused.includes(save.code)
            ? { kind: "refused", code: save.code, message: save.message }
            : { kind: "failed", code: save.code };
      }
    },
  };
}
