/** What a token turns into anywhere but the post it is for. */
const HIDDEN = "[token]";

/**
 * A form token (`_tckt`), as an edit page hands one out, held so a write can post it back and so
 * nothing else can show, log or keep it.
 *
 * Hiroba puts one in every form that writes, and asks for it back with the write. It is a
 * credential for that write, so it is held here as an opaque value: the one exception to this
 * domain's rule that everything survives JSON, and deliberately so. `JSON.stringify` and string
 * conversion give `[token]`, and so does a runtime's inspector. The value sits in a private field,
 * which a structured clone, such as one across Electron's IPC, does not copy. Only `reveal()` gives
 * it back, and the code that builds the post is the one place meant to call it.
 *
 * Nothing about its shape is checked: the value is the site's to choose.
 */
export class FormToken {
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
