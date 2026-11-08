/** The mock Hiroba behind a fetch, or behind the fake CapacitorHttp with its redirects modelled. */
import type { CostumeSet } from "@abth/core";

import {
  type createCostumeEditor,
  INITIAL_COSTUME,
  type MockSession,
} from "../scripts/mock-costume";
import { editorAnswer, page, redirect } from "../scripts/mock-editor-routes";
import type { FavoritesEditor } from "../scripts/mock-favorites";
import type { ProfileEditor } from "../scripts/mock-profile";
import { native, nativeAnswerOf } from "./capacitor-fakes";

/** HttpURLConnection's own limit. */
const NATIVE_REDIRECTS = 5;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

export const costumeSetOf = (state: Record<string, number>): CostumeSet => ({
  colorBody: state.color_body ?? -1,
  colorLimb: state.color_limb ?? -1,
  colorFace: state.color_face ?? -1,
  costume1: state.costume_1 ?? -1,
  costume2: state.costume_2 ?? -1,
  costume3: state.costume_3 ?? -1,
  costume4: state.costume_4 ?? -1,
  costume5: state.costume_5 ?? -1,
});

export const START_SET = costumeSetOf(INITIAL_COSTUME);

export interface StandInOptions {
  readonly editor: ReturnType<typeof createCostumeEditor>;
  /** The title and the name; without one, those pages and posts are not there. */
  readonly profile?: ProfileEditor;
  /** The お気に入り folder and the 大好きな曲; without one, those pages and posts are not there. */
  readonly favorites?: FavoritesEditor;
  readonly session: MockSession;
  /** My page: as it is, or built from the token the read just issued (for the rename dialog). */
  readonly myPage: string | ((ticket: string) => string);
}

export interface StandIn {
  /** Hiroba ends every session: whatever is asked next finds the login page. */
  end(): void;
  restore(): void;
  /** Hiroba's answer to one request, with no redirect followed. */
  answer(request: Request): Promise<Response>;
}

/** The mock Hiroba, answering one request at a time. */
export function hirobaStandIn({
  editor,
  profile,
  favorites,
  session,
  myPage,
}: StandInOptions): StandIn {
  let ended = false;
  const editors = { costume: editor, profile, favorites };

  const route = async (request: Request): Promise<Response> => {
    const signedIn = !ended && session.cardChosen;
    switch (new URL(request.url).pathname) {
      case "/login.php":
        return page(`<form id="login_form"></form>`);
      case "/mypage_top.php":
        if (!signedIn) {
          return redirect("/login.php");
        }
        // My page carries forms with a token: reading it issues a new one and voids the editor's.
        return page(myPage instanceof Function ? myPage(editor.issueTicket(session)) : myPage);
      default: {
        const endSessions = () => {
          ended = true;
        };
        const answer = await editorAnswer(editors, { request, session, signedIn, endSessions });
        return answer ?? new Response("not found", { status: 404 });
      }
    }
  };

  return {
    end: () => {
      ended = true;
    },
    restore: () => {
      ended = false;
    },
    answer: route,
  };
}

/** Makes `native.httpAnswer` answer as the mock Hiroba would, for the calls the app makes next. */
export function standIn(options: StandInOptions): StandIn {
  const hiroba = hirobaStandIn(options);
  native.httpAnswer = async () => {
    // The call being answered is the latest, and is read before anything is awaited.
    const asked = native.httpRequests.at(-1);
    if (asked === undefined) {
      throw new Error("The stand-in was asked to answer a call nobody made");
    }
    let current = asked;
    let url = new URL(asked.url);
    // Unless disabled, up to five redirects are followed with a GET, as HttpURLConnection does.
    for (let hop = 0; ; hop++) {
      const response = await hiroba.answer(
        new Request(url.href, {
          method: current.method,
          headers: current.headers,
          ...(current.method === "POST" && { body: String(current.data) }),
        }),
      );
      const location = response.headers.get("location");
      if (
        location === null ||
        asked.disableRedirects === true ||
        !REDIRECT_STATUSES.has(response.status) ||
        hop === NATIVE_REDIRECTS
      ) {
        return nativeAnswerOf(response, url.href);
      }
      url = new URL(location, url);
      current = {
        url: url.href,
        method: "GET",
        headers: asked.headers,
        responseType: "arraybuffer",
      };
    }
  };
  return hiroba;
}
