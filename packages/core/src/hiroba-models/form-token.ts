const HIDDEN = "[token]";

/** A write's form token (`_tckt`), held opaque: JSON, strings, inspectors show only `[token]`. */
export class FormToken {
  // Private: a structured clone, such as Electron's IPC, does not copy it.
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** The value, for the post that sends it back. */
  reveal(): string {
    return this.#value;
  }

  toJSON(): string {
    return HIDDEN;
  }

  toString(): string {
    return HIDDEN;
  }

  /** What Node's, Bun's and Electron's inspectors print for it. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return HIDDEN;
  }
}
