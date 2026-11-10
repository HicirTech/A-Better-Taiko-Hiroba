import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";
import { render } from "@testing-library/react/pure";
import { createElement, isValidElement } from "react";

import { OverTimeCard } from "../src/know-yourself/over-time-card";
import type { PageParts } from "../src/know-yourself/page-parts";
import { type Stack, stackedBands, stackedLegend } from "../src/know-yourself/stacked-legend";
import { ShareLegend } from "../src/profile/share-block";
import { inADocument } from "./document";
import { writeLane } from "./write-fakes";

inADocument();

const EN = createTranslator("en");
const PARTS: PageParts = {
  i18n: EN,
  lane: writeLane().lane,
  toast: undefined,
  openedIn: () => null,
  toggleIn: () => () => undefined,
  gapList: () => null,
  chartList: () => null,
};

type Layer = "gold" | "silver" | "none";
const GOLD = { id: "gold", name: "Gold", colour: "#ffcc00" };
const SILVER = { id: "silver", name: "Silver", colour: "#cccccc" };
const STACK: Stack<Layer> = {
  id: "card",
  layers: ["gold", "silver", "none"],
  segmentOf: (layer) => ({ gold: GOLD, silver: SILVER, none: undefined })[layer],
};
const POINTS = [
  { value: { gold: 1, silver: 2, none: 3 } },
  { value: { gold: 4, silver: 5, none: 6 } },
];

describe("a stack's bands and legend", () => {
  test("give each layer its colour, none for a layer with no segment", () => {
    expect(stackedBands(STACK)).toEqual([
      { id: "gold", colour: GOLD.colour },
      { id: "silver", colour: SILVER.colour },
      { id: "none", colour: "" },
    ]);
  });

  test("name each layer with a segment at the day chosen, its id the card's", () => {
    const legend = stackedLegend(STACK, POINTS, "count", PARTS)(1, [10, 20]);
    expect(isValidElement(legend) && legend.type === ShareLegend).toBe(true);
    expect(isValidElement(legend) && legend.props).toMatchObject({
      shows: "count",
      tops: [10, 20],
      items: [
        { ...GOLD, id: "card-gold", count: 4 },
        { ...SILVER, id: "card-silver", count: 5 },
      ],
      lane: PARTS.lane,
      i18n: EN,
    });
  });

  test("say nothing for a day with no reading", () => {
    expect(stackedLegend(STACK, POINTS, "percent", PARTS)(2, [])).toBeNull();
  });
});

describe("a card of something over time", () => {
  const card = (readings: number) =>
    render(
      createElement(OverTimeCard, {
        id: "card",
        title: "Title",
        summary: "Summary",
        opened: true,
        readings,
        i18n: EN,
        chart: () => createElement("p", { id: "card-chart" }, "the chart"),
      }),
    ).container;

  test("says one read is not enough to draw", () => {
    const shown = card(1);
    expect(shown.querySelector("#card-one-read")?.textContent).toContain(EN.t("chart.oneRead"));
    expect(shown.querySelector("#card-chart")).toBeNull();
  });

  test("draws its chart from two reads on", () => {
    const shown = card(2);
    expect(shown.querySelector("#card-chart")?.textContent).toBe("the chart");
    expect(shown.querySelector("#card-one-read")).toBeNull();
  });
});
