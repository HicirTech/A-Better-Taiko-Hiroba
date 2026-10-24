import { describe, expect, test } from "bun:test";
import { err, ok } from "@abth/core";

import {
  FAILED_CALL_ANSWERS,
  type HirobaSessionPort,
  type PictureWant,
  PORT_ARGUMENTS,
  settledPort,
} from "../src/shared/session-port";

type Verb = keyof HirobaSessionPort;

const ITEM: PictureWant = { kind: "costumeItem", slot: 2, id: 21 };
const VERBS = Object.keys(PORT_ARGUMENTS) as Verb[];
// Only a picture's answer names what was asked; every other verb's answer ignores its arguments.
const argsOf = (verb: Verb): unknown[] => (verb === "readPicture" ? [ITEM] : []);

/** A port whose every verb answers as `call` does. */
const portOf = (call: (verb: Verb) => Promise<unknown>): HirobaSessionPort =>
  Object.fromEntries(VERBS.map((verb) => [verb, () => call(verb)])) as unknown as HirobaSessionPort;

const callOf = (port: HirobaSessionPort, verb: Verb) =>
  (port[verb] as (...args: unknown[]) => Promise<unknown>)(...argsOf(verb));

describe("settledPort", () => {
  test("has an answer for a failed call of every verb the port has", () => {
    expect(Object.keys(FAILED_CALL_ANSWERS).sort()).toEqual([...VERBS].sort());
  });

  test.each(VERBS)("answers %s's call that rejects as the table says", async (verb) => {
    const port = settledPort(portOf(() => Promise.reject(new Error("refused"))));
    const answer = (FAILED_CALL_ANSWERS[verb] as (...args: unknown[]) => unknown)(...argsOf(verb));

    expect(await callOf(port, verb)).toEqual(answer);
  });

  test("answers a call that throws before it returns as one that rejects", async () => {
    const port = settledPort(
      portOf(() => {
        throw new TypeError("a bug in the port");
      }),
    );

    expect(await port.readProfile()).toEqual(err({ kind: "callFailed" }));
    expect(await port.readPicture(ITEM)).toEqual(err({ code: "costumeItem=callFailed" }));
    expect(await port.signIn()).toEqual({ kind: "unavailable" });
    expect(await port.isSignedIn()).toBe(false);
  });

  test("passes an answer through as it came", async () => {
    const port = settledPort(portOf((verb) => Promise.resolve(ok(verb))));

    expect(await callOf(port, "readScores")).toEqual(ok("readScores"));
    expect(await callOf(port, "isSignedIn")).toEqual(ok("isSignedIn"));
  });
});
