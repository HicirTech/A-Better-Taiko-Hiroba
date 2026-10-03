import { describe, expect, test } from "bun:test";
import { EMPTY_UNDO_SLOT } from "@abth/core";

import { isUndoSlot, readSlot } from "../src/hiroba-session";
import {
  NAME_SLOT,
  namePendingOf,
  nameRecordOf,
  OTHER,
  PLAYER,
  pendingOf,
  recordOf,
  SET,
  TITLE_SLOT,
  titlePendingOf,
  titleRecordOf,
} from "./undo-fixtures";

describe("readSlot", () => {
  type OwnCase = [label: string, slot: unknown];
  test.each<OwnCase>([
    ["a record", { record: recordOf(PLAYER), pending: null }],
    ["a pending write", { record: null, pending: pendingOf(PLAYER) }],
    ["a record and a pending write", { record: recordOf(PLAYER), pending: pendingOf(PLAYER) }],
    ["a stale record", { record: { ...recordOf(PLAYER), status: "stale" }, pending: null }],
    [
      "an undo's pending write",
      { record: null, pending: { ...pendingOf(PLAYER), purpose: "undo" } },
    ],
  ])("reads %s of the player's own as it is", (_label, slot) => {
    expect(readSlot("costume", slot, PLAYER)).toEqual(slot as never);
  });

  type NoneCase = [label: string, slot: unknown];
  test.each<NoneCase>([
    ["nothing", undefined],
    ["null", null],
    ["a number", 3],
    ["a string", "slot"],
    ["a list", []],
    ["an object with neither key", {}],
    ["a slot with no pending key", { record: null }],
    ["a slot with no record key", { pending: null }],
    ["a record of another player's", { record: recordOf(OTHER), pending: null }],
    ["a pending write of another player's", { record: null, pending: pendingOf(OTHER) }],
    [
      "the player's record beside another player's pending write",
      { record: recordOf(PLAYER), pending: pendingOf(OTHER) },
    ],
    [
      "a record with a taiko number that is no string",
      { record: { ...recordOf(PLAYER), taikoNo: 1 }, pending: null },
    ],
    ["a record with no time", { record: { ...recordOf(PLAYER), at: undefined }, pending: null }],
    [
      "a record with another status",
      { record: { ...recordOf(PLAYER), status: "old" }, pending: null },
    ],
    [
      "a record whose set lacks a value",
      { record: { ...recordOf(PLAYER), before: { ...SET, costume5: undefined } }, pending: null },
    ],
    [
      "a record whose set holds a value no costume has",
      { record: { ...recordOf(PLAYER), after: { ...SET, colorFace: 10000 } }, pending: null },
    ],
    [
      "a record whose set holds another key",
      { record: { ...recordOf(PLAYER), after: { ...SET, title: 1 } }, pending: null },
    ],
    [
      "a pending write with another purpose",
      { record: null, pending: { ...pendingOf(PLAYER), purpose: "redo" } },
    ],
    [
      "a pending write whose expected set is not a set",
      { record: null, pending: { ...pendingOf(PLAYER), expectedAfter: "3" } },
    ],
  ])("reads %s as no slot", (_label, slot) => {
    expect(readSlot("costume", slot, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });
});

describe("readSlot, the title", () => {
  type OwnCase = [label: string, slot: unknown];
  test.each<OwnCase>([
    ["a record", TITLE_SLOT],
    ["a pending write", { record: null, pending: titlePendingOf(PLAYER) }],
    [
      "a record of no title before, a normal state",
      { record: { ...titleRecordOf(PLAYER), before: { title: "" } }, pending: null },
    ],
  ])("reads %s of the player's own as it is", (_label, slot) => {
    expect(readSlot("title", slot, PLAYER)).toEqual(slot as never);
  });

  type NoneCase = [label: string, slot: unknown];
  test.each<NoneCase>([
    ["a record of another player's", { record: titleRecordOf(OTHER), pending: null }],
    ["a pending write of another player's", { record: null, pending: titlePendingOf(OTHER) }],
    ["a costume's slot, which is no title's", { record: recordOf(PLAYER), pending: null }],
    [
      "a record whose title is no string",
      { record: { ...titleRecordOf(PLAYER), after: { title: 3 } }, pending: null },
    ],
    [
      "a record whose title is longer than the port takes",
      { record: { ...titleRecordOf(PLAYER), after: { title: "あ".repeat(201) } }, pending: null },
    ],
    [
      "a record whose set holds another key",
      { record: { ...titleRecordOf(PLAYER), after: { title: "あ", id: 1 } }, pending: null },
    ],
    [
      "a pending write whose expected set is a costume",
      { record: null, pending: { ...titlePendingOf(PLAYER), expectedAfter: SET } },
    ],
  ])("reads %s as no slot", (_label, slot) => {
    expect(readSlot("title", slot, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("reads a title's slot as no slot under the costume kind", () => {
    expect(readSlot("costume", TITLE_SLOT, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });
});

describe("readSlot, the name", () => {
  type OwnCase = [label: string, slot: unknown];
  test.each<OwnCase>([
    ["a record", NAME_SLOT],
    ["a pending write", { record: null, pending: namePendingOf(PLAYER) }],
    [
      "an undo's pending write",
      { record: null, pending: { ...namePendingOf(PLAYER), purpose: "undo" } },
    ],
  ])("reads %s of the player's own as it is", (_label, slot) => {
    expect(readSlot("name", slot, PLAYER)).toEqual(slot as never);
  });

  type NoneCase = [label: string, slot: unknown];
  test.each<NoneCase>([
    ["a record of another player's", { record: nameRecordOf(OTHER), pending: null }],
    ["a pending write of another player's", { record: null, pending: namePendingOf(OTHER) }],
    ["a costume's slot, which is no name's", { record: recordOf(PLAYER), pending: null }],
    ["a title's slot, which is no name's", { ...TITLE_SLOT }],
    [
      "a record whose name is no string",
      { record: { ...nameRecordOf(PLAYER), after: { nickname: 3 } }, pending: null },
    ],
    [
      "a record of no name, which my page never shows",
      { record: { ...nameRecordOf(PLAYER), before: { nickname: "" } }, pending: null },
    ],
    [
      "a record whose name is longer than the port takes",
      { record: { ...nameRecordOf(PLAYER), after: { nickname: "あ".repeat(65) } }, pending: null },
    ],
    [
      "a record whose set holds another key",
      {
        record: { ...nameRecordOf(PLAYER), after: { nickname: "あ", title: "い" } },
        pending: null,
      },
    ],
    [
      "a pending write whose expected set is a title",
      { record: null, pending: { ...namePendingOf(PLAYER), expectedAfter: { title: "あ" } } },
    ],
  ])("reads %s as no slot", (_label, slot) => {
    expect(readSlot("name", slot, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("reads a name's slot as no slot under the other kinds", () => {
    expect(readSlot("costume", NAME_SLOT, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(readSlot("title", NAME_SLOT, PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });
});

describe("isUndoSlot", () => {
  test("holds a slot to its shape and not to a player, which a file of the first version needs", () => {
    const theirs = { record: recordOf(OTHER), pending: pendingOf(PLAYER) };
    expect(isUndoSlot("costume", theirs)).toBe(true);
    expect(
      isUndoSlot("costume", { record: { ...recordOf(OTHER), status: "old" }, pending: null }),
    ).toBe(false);
  });
});
