import { isErr } from "@abth/core";

import type { PictureKey, PictureStore } from "../shared/picture-store";
import { checkPng, pngDataUrl } from "../shared/png-answer";
import type { PictureView } from "../shared/session-port";
import type { PictureRequest } from "./picture-requests";

/** One picture by its key, wherever it is kept. */
export const pictureId = (key: PictureKey) => `${key.scope}|${key.player ?? ""}|${key.name}`;

/** The pictures kept: the device's store, and the bare plates held until my page is read again. */
export function createPictureCache(store: PictureStore) {
  const unconfirmed = new Map<string, { readonly key: PictureKey; readonly bytes: Uint8Array }>();

  const viewOf = (bytes: Uint8Array, request: PictureRequest): PictureView | null => {
    const checked = checkPng(
      { status: 200, url: request.url, headers: { "content-type": "image/png" }, body: bytes },
      request.rules,
    );
    if (isErr(checked) || checked.value.size === null) {
      return null;
    }
    return { src: pngDataUrl(checked.value.bytes), ...checked.value.size };
  };

  const kept = async (request: PictureRequest): Promise<PictureView | null> => {
    const shown = unconfirmed.get(pictureId(request.key));
    if (shown !== undefined) {
      return viewOf(shown.bytes, request);
    }
    try {
      const bytes = await store.get(request.key);
      return bytes === null ? null : viewOf(bytes, request);
    } catch {
      return null;
    }
  };

  return {
    kept,
    /** Holds a bare plate until a read of my page finds the session good. */
    hold(key: PictureKey, bytes: Uint8Array) {
      unconfirmed.set(pictureId(key), { key, bytes });
    },
    /** After a good read of my page: keeps the bare plates held this session as `owner`'s. */
    async confirm(owner: string) {
      for (const [id, { key, bytes }] of unconfirmed) {
        if (key.player === owner) {
          try {
            await store.put(key, bytes);
          } catch {
            // Only the store's copy is lost: the plate is fetched again the next time.
          }
        }
        unconfirmed.delete(id);
      }
    },
    /** Lets go of the plates held: the session they were fetched for has gone. */
    forget() {
      unconfirmed.clear();
    },
  };
}
