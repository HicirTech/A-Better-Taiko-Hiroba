import { err, ok, type Result } from "@abth/core";

import { PICTURE_EPOCH, type PictureKey, type PictureStore } from "../hiroba-session/picture-store";
import { base64Of } from "../hiroba-session/png-answer";
import { type GroupAsked, type Pipeline, resultFailure } from "../pipelines";
import type { PictureFailure, PictureView } from "../session-port/types";
import { isChartPictureAddress } from "./catalogue-links";
import { sniffPicture } from "./sniff-picture";

export const CHART_PICTURE_MAX_BYTES = 4 * 1024 * 1024;
const CHART_PICTURE_TIMEOUT_MS = 30_000;

/** The operation a chart picture's fetch runs as in its pipeline. */
export const CHART_PICTURE_OPERATION = "chartPicture";
const CHART_PICTURE: GroupAsked<Result<PictureView, PictureFailure>> = {
  operation: CHART_PICTURE_OPERATION,
  failureOf: resultFailure,
};

export interface ChartPictureReaderOptions {
  readonly store: PictureStore;
  /** The pipeline for sites other than Hiroba: each fetch is a read group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  /** In a development run, the stand-in's origin, read beside the chart hosts. */
  readonly chartOrigin: string | undefined;
}

export type ChartPictureReader = (url: string) => Promise<Result<PictureView, PictureFailure>>;

const failed = (why: string): Result<never, PictureFailure> => err({ code: `chart=${why}` });

/** The picture `bytes` hold, judged by the bytes alone and never by a header of the answer. */
function viewOf(bytes: Uint8Array): Result<PictureView, "tooLarge" | "notPicture"> {
  if (bytes.byteLength > CHART_PICTURE_MAX_BYTES) {
    return err("tooLarge");
  }
  const picture = sniffPicture(bytes);
  if (picture === null) {
    return err("notPicture");
  }
  const { format, width, height } = picture;
  return ok({ src: `data:image/${format};base64,${base64Of(bytes)}`, width, height });
}

/** Chart pictures: one GET each, with no session, kept on the device once they pass the checks. */
export function createChartPictureReader(options: ChartPictureReaderOptions): ChartPictureReader {
  const { store, pipeline, chartOrigin } = options;
  const inFlight = new Map<string, Promise<Result<PictureView, PictureFailure>>>();

  const read = async (url: string): Promise<Result<PictureView, PictureFailure>> => {
    if (!isChartPictureAddress(url, chartOrigin)) {
      return failed("notAllowed");
    }
    // Shared by every account; the store files it under a hash, so no address is written out.
    const key: PictureKey = {
      scope: "shared",
      player: null,
      name: `${PICTURE_EPOCH}/chart/${url}`,
    };
    const kept = await store.get(key);
    const keptView = kept === null ? null : viewOf(kept);
    if (keptView?.ok) {
      return keptView;
    }
    // The checks are in the group too, so the pipelines page counts a picture refused as failed.
    return pipeline.read(CHART_PICTURE, async (transport) => {
      const sent = await transport.send(
        { method: "GET", url },
        AbortSignal.timeout(CHART_PICTURE_TIMEOUT_MS),
      );
      if (!sent.ok) {
        return failed(sent.error.kind === "unreachable" ? "unreachable" : "timedOut");
      }
      const { status, url: endedAt, body } = sent.value;
      if (!isChartPictureAddress(endedAt, chartOrigin)) {
        return failed("notAllowed");
      }
      if (status !== 200) {
        return failed(`status-${status}`);
      }
      const view = viewOf(body);
      if (!view.ok) {
        return failed(view.error);
      }
      await store.put(key, body);
      return view;
    });
  };

  return (url) => {
    const onItsWay = inFlight.get(url);
    if (onItsWay !== undefined) {
      return onItsWay;
    }
    const reading = read(url).finally(() => inFlight.delete(url));
    inFlight.set(url, reading);
    return reading;
  };
}
