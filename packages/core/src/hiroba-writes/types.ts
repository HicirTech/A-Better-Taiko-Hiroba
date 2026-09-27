import type { FormToken } from "../hiroba-models";
import type { TransportFailure } from "../http-transport";

/**
 * One ajax post a write sends, as the page's own script would build it.
 *
 * Paths are relative to Hiroba's origin with no leading slash, as the site's scripts write them.
 */
export interface AjaxPost {
  /** The endpoint, such as `ajax/change_mydon.php`. */
  readonly path: string;
  /** The page whose script sends the post, such as `mypage_kisekae.php`: sent as the Referer. */
  readonly referer: string;
  /**
   * The body, in the order the page serialises it. A form token goes in as itself and is revealed
   * only as the request is built.
   */
  readonly form: readonly (readonly [name: string, value: string | FormToken])[];
}

/**
 * What came back from an ajax post, sorted before anything reads a result code. Each kind carries
 * `code`, codes for a report: where the answer ended, its status, type and size. Never the body,
 * which can hold a fresh form token.
 */
export type AjaxAnswer =
  /** JSON, as every answer the site's handlers were seen to give. `value` stays in the core. */
  | { readonly kind: "json"; readonly value: unknown; readonly code: string }
  /**
   * The site's own error page at 200 (`<h1>エラー</h1>`, a bare table, no login form): the handler
   * was never reached, which is how an ajax page answers a post without `X-Requested-With`.
   */
  | { readonly kind: "rejected"; readonly code: string }
  /**
   * The answer ended on the login or card-select page. Only a signal: how an ajax page answers a
   * client that is not a browser has never been seen, so a GET decides whether the session ended.
   */
  | { readonly kind: "endedAtLogin"; readonly code: string }
  /** A plain 404: the endpoint is not there. */
  | { readonly kind: "endpointMissing"; readonly code: string }
  /** Anything else, JSON that does not parse included. */
  | { readonly kind: "unexpected"; readonly code: string }
  /** The post produced no answer. After a save, that does not mean nothing was saved. */
  | {
      readonly kind: "noAnswer";
      readonly failure: TransportFailure["kind"];
      readonly code: string;
    };

/**
 * How a write's pre-check answered. Only `clear` lets the write go on to its save.
 *
 * The site's own scripts compare the pre-check's `result` loosely with true (`data.result ==
 * true`), so `true`, `1` and `"1"` all mean it wants a confirmation. Everything else that is not
 * the boolean false — `0`, `"0"`, null, a missing result, text — is a shape nobody has seen, and
 * stops the write too.
 */
export type PrecheckVerdict =
  | "clear"
  | "needsConfirmation"
  | "unexpected"
  | "rejected"
  | "endedAtLogin"
  | "endpointMissing"
  | "noAnswer";
