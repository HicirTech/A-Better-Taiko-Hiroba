import type { NotAppliedReason, SaveCodes, SaveReading } from "./types";

/**
 * The result codes of `ajax/change_mydon_profile.php`, the one endpoint that sets the title and
 * renames the player, copied from the site's two scripts for it (`titleComp` in title.js and
 * `profileUpdate` in dialog.js), which read them alike but for what a refusal is:
 *
 * - 0 is success; 3 is success with the game server not told, which counts only when the read-back
 *   shows the change; the answer never proves a write;
 * - 705 is a token no longer good, and 900 and 901 are maintenance;
 * - the codes in `refused` are the ones that script words as the site's refusal of this very
 *   change, with the answer's `err_message` where it has one;
 * - anything else is a failure, 3 with nothing moved included.
 */
export function profileCodes(refused: readonly number[]): SaveCodes {
  return {
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
