/**
 * The port with its arguments checked: every verb passes on what PORT_ARGUMENTS takes and rejects
 * what it refuses, without the verb ever seeing it.
 */
import { describe, expect, test } from "bun:test";

import { checkedPort, type HirobaSessionPort, PORT_ARGUMENTS } from "../src/session-port";

const SET = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

type Verb = keyof HirobaSessionPort;
/** What each verb takes, and one thing it refuses. */
type VerbCase = [verb: Verb, taken: unknown[], refused: unknown[]];
const CASES: VerbCase[] = [
  ["isSignedIn", [], [undefined]],
  ["signIn", [], ["https://example.test/"]],
  ["cancelSignIn", [], [null]],
  ["readProfile", [], [{ force: true }]],
  ["signOut", [], [1]],
  ["openCostumeEditor", [], [{ url: "https://example.test/" }]],
  ["previewCostume", [SET], [{ ...SET, url: "https://example.test/" }]],
  ["readPicture", [{ kind: "myDon" }], [{ kind: "myDon", fn: "mydon_111111111111" }]],
  [
    "changeCostume",
    [{ expected: SET, target: SET }],
    [{ expected: SET, target: { ...SET, costume1: -1 } }],
  ],
  ["pendingUndo", [], [{}]],
  ["undo", ["costume"], ["title"]],
];

/** A port whose every verb notes what it was asked and answers with its own name. */
function recordingPort() {
  const calls: { verb: string; args: unknown[] }[] = [];
  const verbs = Object.fromEntries(
    Object.keys(PORT_ARGUMENTS).map((verb) => [
      verb,
      async (...args: unknown[]) => {
        calls.push({ verb, args });
        return `answer to ${verb}`;
      },
    ]),
  );
  return { calls, port: verbs as unknown as HirobaSessionPort };
}

describe("checkedPort", () => {
  test("has a case for every verb of the port, so a verb added later is checked here too", () => {
    expect<string[]>(CASES.map(([verb]) => verb).sort()).toEqual(
      Object.keys(PORT_ARGUMENTS).sort(),
    );
  });

  test.each(CASES)("%s passes on what it takes", async (verb, taken) => {
    const { calls, port } = recordingPort();
    const asked = (checkedPort(port)[verb] as (...args: unknown[]) => Promise<unknown>)(...taken);
    expect(await asked).toBe(`answer to ${verb}`);
    expect(calls).toEqual([{ verb, args: taken }]);
  });

  test.each(CASES)(
    "%s rejects what it refuses, without the verb seeing it",
    async (verb, _taken, refused) => {
      const { calls, port } = recordingPort();
      const asked = (checkedPort(port)[verb] as (...args: unknown[]) => Promise<unknown>)(
        ...refused,
      );
      await expect(asked).rejects.toThrow(`Refused ${verb}: arguments it does not take`);
      expect(calls).toEqual([]);
    },
  );

  test("rejects a call with an argument too many, even to a verb that takes none", async () => {
    const { calls, port } = recordingPort();
    const checked = checkedPort(port);
    await expect(checked.readProfile(...([1] as unknown as []))).rejects.toThrow("Refused");
    expect(calls).toEqual([]);
  });
});
