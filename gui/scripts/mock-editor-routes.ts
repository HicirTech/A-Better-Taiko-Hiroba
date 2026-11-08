/** Hiroba's costume, title and favourites pages, posts and pictures, for both stand-ins. */
import { type createCostumeEditor, ERROR_SHELL_BODY, type MockSession } from "./mock-costume";
import type { FavoritesEditor } from "./mock-favorites";
import type { ProfileEditor } from "./mock-profile";

const LOGIN = "/login.php";

export const page = (body: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    {
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
export const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 302, headers: { location, ...headers } });
const notFound = () => new Response("not found", { status: 404 });

/** The editors a stand-in holds: one without the title's or the favourites' has no such pages. */
export interface MockEditors {
  readonly costume: ReturnType<typeof createCostumeEditor>;
  readonly profile?: ProfileEditor | undefined;
  readonly favorites?: FavoritesEditor | undefined;
}

/** A request, the session its cookie names, and what the stand-in makes of that session. */
export interface MockAsk {
  readonly request: Request;
  readonly session: MockSession | undefined;
  readonly signedIn: boolean;
  /** What a save that ends every session does. */
  readonly endSessions: () => void;
  /** An answer a signed-in post gets before its editor sees it; null lets it through. */
  readonly beforePost?: () => Response | null;
}

/** A post as Hiroba checks one before its handler: by script, in a live session. */
export async function enteredPost(
  ask: MockAsk,
  record: (form: URLSearchParams) => void,
): Promise<{ form: URLSearchParams; session: MockSession } | Response> {
  const { request } = ask;
  if (request.method !== "POST") {
    return notFound();
  }
  const form = new URLSearchParams(await request.text());
  record(form);
  if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return page(ERROR_SHELL_BODY);
  }
  const session = ask.signedIn ? ask.session : undefined;
  if (session === undefined) {
    return redirect(LOGIN);
  }
  return ask.beforePost?.() ?? { form, session };
}

/** An editor's page, post or picture for the asked path; null for any other path. */
export async function editorAnswer(
  { costume, profile, favorites }: MockEditors,
  ask: MockAsk,
): Promise<Response | null> {
  const { request } = ask;
  const { pathname, search, searchParams } = new URL(request.url);
  const live = ask.signedIn ? ask.session : undefined;
  const signedInOnly = (answer: (session: MockSession) => Response) =>
    live === undefined ? redirect(LOGIN) : answer(live);
  const recorded = (editor: { record: typeof costume.record }) => (form: URLSearchParams) =>
    editor.record(pathname, request, form, ask.session);
  switch (pathname) {
    case "/mypage_kisekae.php":
      return signedInOnly((session) => page(costume.page(session)));
    case "/ajax/check_ip_kisekae.php":
    case "/ajax/change_mydon.php": {
      const entered = await enteredPost(ask, recorded(costume));
      if (entered instanceof Response) {
        return entered;
      }
      if (pathname === "/ajax/check_ip_kisekae.php") {
        await costume.precheckLetThrough();
        return costume.precheck();
      }
      return costume.save(entered.session, entered.form, ask.endSessions);
    }
    case "/mypage_title_edit.php":
      return profile === undefined
        ? notFound()
        : signedInOnly((session) => page(profile.titlePage(session)));
    case "/ajax/check_ip_title.php":
    case "/ajax/change_mydon_profile.php": {
      if (profile === undefined) {
        return notFound();
      }
      const entered = await enteredPost(ask, recorded(profile));
      if (entered instanceof Response) {
        return entered;
      }
      if (pathname === "/ajax/check_ip_title.php") {
        await profile.precheckLetThrough();
        return profile.precheck();
      }
      await profile.saveLetThrough();
      return profile.save(entered.session, entered.form, ask.endSessions);
    }
    case "/favorite_song_select.php":
      return favorites === undefined
        ? notFound()
        : signedInOnly((session) => page(favorites.folderPage(session, searchParams)));
    case "/portal_favorite_song_select.php":
      return favorites === undefined
        ? notFound()
        : signedInOnly((session) => page(favorites.favoriteSongPage(session)));
    case "/form_data.php":
      return favorites === undefined
        ? notFound()
        : signedInOnly((session) =>
            redirect(
              favorites.enterPicker(session, searchParams) ? "/select_song.php" : "/index.php",
            ),
          );
    case "/select_song.php":
      return favorites === undefined
        ? notFound()
        : signedInOnly((session) => {
            const shown = favorites.pickerPage(session, Number(searchParams.get("genre") ?? "1"));
            return shown === null ? redirect("/index.php") : page(shown);
          });
    case "/ajax/myfavorite_song.php":
    case "/ajax/mypage_song.php": {
      if (favorites === undefined) {
        return notFound();
      }
      const entered = await enteredPost(ask, recorded(favorites));
      if (entered instanceof Response) {
        return entered;
      }
      return pathname === "/ajax/myfavorite_song.php"
        ? favorites.saveFolder(entered.session, entered.form)
        : favorites.saveFavoriteSong(entered.session, entered.form);
    }
    case "/imgsrc_mydon.php":
      return costume.preview(search, ask.signedIn);
    case "/imgsrc_kisekae.php":
      return costume.thumbnail(searchParams, ask.signedIn, request.headers.get("referer"));
    default:
      return null;
  }
}
