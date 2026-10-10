/** Stateful stand-in for the ↻: it refreshes with the last token issued, or answers as set. */
import type { MockSession } from "./mock-costume";

export function createPlayHistory() {
  let refreshAnswer = 0;
  let refreshes = 0;

  return {
    /** The ↻: only with the last token issued does Hiroba refresh. */
    refresh(session: MockSession, form: URLSearchParams, backUrl: string): unknown {
      if (session.ticket === undefined || form.get("_tckt") !== session.ticket) {
        return { result: 705 };
      }
      if (refreshAnswer !== 0) {
        return { result: refreshAnswer };
      }
      refreshes += 1;
      return { result: 0, back_url: backUrl };
    },

    /** `/__history`: `refresh=` sets what the ↻ answers next. */
    control(params: URLSearchParams): unknown {
      if (params.has("refresh")) {
        refreshAnswer = Number(params.get("refresh") ?? "0");
      }
      return { refreshes };
    },
  };
}
