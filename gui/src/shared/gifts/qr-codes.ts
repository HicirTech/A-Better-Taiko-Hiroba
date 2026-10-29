import jsQR from "jsqr";
import { encode } from "uqr";

/** White modules round a code, as its readers need. */
const QUIET_MODULES = 4;

/** A QR code of `text` as one SVG path in a square `size` modules wide, its white room included. */
export function qrCodePath(text: string): { readonly size: number; readonly path: string } {
  // The highest level: a code still reads after a chat app has compressed its picture.
  const { data, size } = encode(text, { ecc: "H", border: QUIET_MODULES });
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
    .join("");
  return { size, path };
}

/** The text of the QR code in a picture's RGBA pixels, read as UTF-8; null where none reads. */
export function qrTextIn(pixels: Uint8ClampedArray, width: number, height: number): string | null {
  const found = jsQR(pixels, width, height);
  return found === null ? null : new TextDecoder().decode(Uint8Array.from(found.binaryData));
}
