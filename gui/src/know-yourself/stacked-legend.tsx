import type { ReactNode } from "react";

import { ShareLegend } from "../profile/share-block";
import type { AreaBand } from "../ui/time-chart";
import type { PageParts } from "./page-parts";
import type { Segment } from "./segments";

/** An area chart's stack: its layers from the bottom up, each drawn as its segment. */
export interface Stack<K extends string | number> {
  /** The card's, which each legend item's id starts with. */
  readonly id: string;
  readonly layers: readonly K[];
  readonly segmentOf: (layer: K) => Segment | undefined;
}

export const stackedBands = <K extends string | number>({
  layers,
  segmentOf,
}: Stack<K>): AreaBand[] =>
  layers.map((layer) => ({ id: String(layer), colour: segmentOf(layer)?.colour ?? "" }));

/** The legend at the chart's right: each layer named, with its value on the day chosen. */
export function stackedLegend<K extends string | number>(
  { id, layers, segmentOf }: Stack<K>,
  points: readonly { readonly value: Readonly<Record<K, number>> }[],
  shows: "percent" | "count",
  { lane, toast, i18n }: PageParts,
): (place: number, tops: readonly number[]) => ReactNode {
  return (place, tops) => {
    const point = points[place];
    return point === undefined ? null : (
      <ShareLegend
        shows={shows}
        tops={tops}
        items={layers.flatMap((layer) => {
          const segment = segmentOf(layer);
          return segment === undefined
            ? []
            : [{ ...segment, id: `${id}-${layer}`, count: point.value[layer] }];
        })}
        lane={lane}
        toast={toast}
        i18n={i18n}
      />
    );
  };
}
