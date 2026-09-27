/**
 * Writing to Hiroba: the one way every write goes, and the pieces it is built from.
 *
 * A write on Hiroba is a form posted to one of its ajax pages, and the page's markup does not say
 * what the endpoint wants: the rules here come from the site's own scripts and from writes executed
 * and read back on 2026-08-09 (the wiki's Writing-Data page). `postAjax` is the only code that
 * builds a post, and so the only code that reveals a form token.
 */
export { postAjax, readPrecheck, readSaveCode, readSaveMessage } from "./ajax";
export type { AjaxAnswer, AjaxPost, PrecheckVerdict } from "./types";
