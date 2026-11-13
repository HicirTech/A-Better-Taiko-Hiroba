import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react/pure";
import { createElement } from "react";

import { SectionCard, type SectionCardProps } from "../src/ui/section-card";
import { inADocument } from "./document";

inADocument();

// Emotion, loaded before the document is, writes each element's styles in a tag before it.
const drawnIn = (element: Element) =>
  [...element.children].filter((child) => child.tagName !== "STYLE");

const cardOf = (props: Omit<SectionCardProps, "id" | "children">) => {
  const all: SectionCardProps = {
    ...props,
    id: "card",
    children: createElement("p", { id: "content" }),
  };
  const card = render(createElement(SectionCard, all)).container.querySelector("#card");
  if (card === null) {
    throw new Error("no card drawn");
  }
  return card;
};

describe("a section card", () => {
  test("is a section its heading names when the heading has an id", () => {
    const card = cardOf({ heading: { id: "heading", children: "Title" } });
    const [heading, content] = drawnIn(card);
    expect(card.tagName).toBe("SECTION");
    expect(card.getAttribute("aria-labelledby")).toBe("heading");
    expect(heading?.id).toBe("heading");
    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent).toContain("Title");
    expect(content?.id).toBe("content");
  });

  test("stays an unnamed div under a heading with no id", () => {
    const card = cardOf({ heading: { level: 3, children: "Title" } });
    expect(card.tagName).toBe("DIV");
    expect(card.hasAttribute("aria-labelledby")).toBe(false);
    expect(drawnIn(card)[0]?.tagName).toBe("H3");
  });

  test("is the section asked for with no heading, and no name", () => {
    const card = cardOf({ component: "section" });
    expect(card.tagName).toBe("SECTION");
    expect(card.hasAttribute("aria-labelledby")).toBe(false);
    expect(drawnIn(card).map((child) => child.id)).toEqual(["content"]);
  });

  test("gives its heading the card's room when flush, and its content none", () => {
    const card = cardOf({ heading: { id: "heading", children: "Title" }, flush: true });
    const [room, content] = drawnIn(card);
    expect(room === undefined ? [] : drawnIn(room).map((child) => child.id)).toEqual(["heading"]);
    expect(content?.id).toBe("content");
    expect(getComputedStyle(card).paddingTop).toBe("0px");
    expect(room === undefined ? null : getComputedStyle(room).paddingTop).toBe("8px");
    expect(room === undefined ? null : getComputedStyle(room).paddingLeft).toBe("8px");
  });

  test("draws a flush card's content alone when it has no heading", () => {
    const card = cardOf({ flush: true });
    expect(drawnIn(card).map((child) => child.id)).toEqual(["content"]);
  });
});
