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
type VerbCase = [verb: Verb, taken: unknown[], refused: unknown[]];
const TITLE = { title: "サンプルの称号" };
const TARGET = { id: 106, title: "サンプルの称号" };
const NAME = { nickname: "サンプルどん" };
const CASES: VerbCase[] = [
  ["isSignedIn", [], [undefined]],
  ["signIn", [], ["https://example.test/"]],
  ["cancelSignIn", [], [null]],
  ["readProfile", [], [{ force: true }]],
  ["signOut", [], [1]],
  ["openCostumeEditor", [], [{ url: "https://example.test/" }]],
  ["openTitleEditor", [], [{ url: "https://example.test/" }]],
  ["previewCostume", [SET], [{ ...SET, url: "https://example.test/" }]],
  ["readPicture", [{ kind: "myDon" }], [{ kind: "myDon", fn: "mydon_111111111111" }]],
  [
    "changeCostume",
    [{ expected: SET, target: SET }],
    [{ expected: SET, target: { ...SET, costume1: -1 } }],
  ],
  [
    "changeTitle",
    [{ expected: TITLE, target: TARGET }],
    [{ expected: TITLE, target: { ...TARGET, id: null } }],
  ],
  [
    "changeName",
    [{ expected: NAME, target: { nickname: "あたらしい" } }],
    [{ expected: NAME, target: { nickname: "" } }],
  ],
  ["pendingUndo", [], [{}]],
  ["undo", ["name"], ["settings"]],
];

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
