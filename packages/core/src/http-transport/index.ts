/**
 * The contract every platform's network stack fulfils so the core can ask Hiroba for a page, or
 * post a form to it.
 *
 * Types only. Each platform implements `Transport` once, and that implementation is the only code
 * that ever holds the session cookie.
 */
export type {
  Transport,
  TransportFailure,
  TransportGet,
  TransportPost,
  TransportRequest,
  TransportResponse,
} from "./types";
