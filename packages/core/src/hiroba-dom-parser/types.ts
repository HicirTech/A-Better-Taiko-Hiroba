/** Failure kinds are codes, not sentences: the interface translates them (see epic #13). */
export type ParseFailure = LoggedOutFailure | MissingMarkerFailure;

export interface LoggedOutFailure {
  readonly kind: "loggedOut";
  /** The page that was requested — not the login page Hiroba answered with. */
  readonly page: string;
}

export interface MissingMarkerFailure {
  readonly kind: "missingMarker";
  readonly page: string;
  /** The CSS selector that found nothing. */
  readonly marker: string;
}
