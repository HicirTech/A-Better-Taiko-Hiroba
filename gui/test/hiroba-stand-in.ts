/** The mock Hiroba behind the fake CapacitorHttp; the platform's redirect following is modelled. */
import type { CostumeSet } from "@abth/core";

import {
  type createCostumeEditor,
  ERROR_SHELL_BODY,
  INITIAL_COSTUME,
  type MockSession,
} from "../scripts/mock-costume";
import type { FavoritesEditor } from "../scripts/mock-favorites";
import type { ProfileEditor } from "../scripts/mock-profile";
import { type NativeHttpRequest, native, nativeAnswerOf } from "./capacitor-fakes";

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
}

const html = (body: string) =>
  new Response(`<html><body>${body}</body></html>`, {
    headers: { "content-type": "text/html; charset=UTF-8" },
  });
const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } });

/** Makes `native.httpAnswer` answer as the mock Hiroba would, for the calls the app makes next. */
export function standIn({ editor, profile, favorites, session, myPage }: StandInOptions): StandIn {
  let ended = false;

  const route = async (asked: NativeHttpRequest, url: URL): Promise<Response> => {
    const signedIn = !ended && session.cardChosen;
    const request = new Request(url.href, {
      method: asked.method,
      headers: asked.headers,
      ...(asked.method === "POST" && { body: String(asked.data) }),
    });
    switch (url.pathname) {
      case "/login.php":
        return html(`<form id="login_form"></form>`);
      case "/mypage_top.php":
        if (!signedIn) {
          return redirectTo("/login.php");
        }
        // My page carries forms with a token: reading it issues a new one and voids the editor's.
        return html(myPage instanceof Function ? myPage(editor.issueTicket(session)) : myPage);
      case "/mypage_kisekae.php":
        return signedIn ? html(editor.page(session)) : redirectTo("/login.php");
      case "/ajax/check_ip_kisekae.php":
      case "/ajax/change_mydon.php": {
        if (asked.method !== "POST") {
          return new Response("not found", { status: 404 });
        }
        const form = new URLSearchParams(String(asked.data));
        editor.record(url.pathname, request, form, session);
        if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
          return html(ERROR_SHELL_BODY);
        }
        if (!signedIn) {
          return redirectTo("/login.php");
        }
        if (url.pathname === "/ajax/check_ip_kisekae.php") {
          await editor.precheckLetThrough();
          return editor.precheck();
        }
        return editor.save(session, form, () => {
          ended = true;
        });
      }
      case "/mypage_title_edit.php":
        if (profile === undefined) {
          return new Response("not found", { status: 404 });
        }
        return signedIn ? html(profile.titlePage(session)) : redirectTo("/login.php");
      case "/ajax/check_ip_title.php":
      case "/ajax/change_mydon_profile.php": {
        if (asked.method !== "POST" || profile === undefined) {
          return new Response("not found", { status: 404 });
        }
        const form = new URLSearchParams(String(asked.data));
        profile.record(url.pathname, request, form, session);
        if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
          return html(ERROR_SHELL_BODY);
        }
        if (!signedIn) {
          return redirectTo("/login.php");
        }
        if (url.pathname === "/ajax/check_ip_title.php") {
          await profile.precheckLetThrough();
          return profile.precheck();
        }
        await profile.saveLetThrough();
        return profile.save(session, form, () => {
          ended = true;
        });
      }
      case "/favorite_song_select.php":
        if (favorites === undefined) {
          return new Response("not found", { status: 404 });
        }
        return signedIn
          ? html(favorites.folderPage(session, url.searchParams))
          : redirectTo("/login.php");
      case "/portal_favorite_song_select.php":
        if (favorites === undefined) {
          return new Response("not found", { status: 404 });
        }
        return signedIn ? html(favorites.favoriteSongPage(session)) : redirectTo("/login.php");
      case "/form_data.php":
        if (favorites === undefined) {
          return new Response("not found", { status: 404 });
        }
        if (!signedIn) {
          return redirectTo("/login.php");
        }
        return redirectTo(
          favorites.enterPicker(session, url.searchParams) ? "/select_song.php" : "/index.php",
        );
      case "/select_song.php": {
        if (favorites === undefined) {
          return new Response("not found", { status: 404 });
        }
        if (!signedIn) {
          return redirectTo("/login.php");
        }
        const shown = favorites.pickerPage(session, Number(url.searchParams.get("genre") ?? "1"));
        return shown === null ? redirectTo("/index.php") : html(shown);
      }
      case "/imgsrc_mydon.php":
        return editor.preview(url.search, signedIn);
      case "/imgsrc_kisekae.php":
        return editor.thumbnail(url.searchParams, signedIn, request.headers.get("referer"));
      default:
        return new Response("not found", { status: 404 });
    }
  };

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
      const response = await route(current, url);
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

  return {
    end: () => {
      ended = true;
    },
    restore: () => {
      ended = false;
    },
  };
}
