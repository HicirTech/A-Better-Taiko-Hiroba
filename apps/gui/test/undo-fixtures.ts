import type {
  CostumeSet,
  NameState,
  PendingUndo,
  TitleState,
  UndoRecord,
  UndoSlot,
} from "@abth/core";

export const PLAYER = "000000000000";
export const OTHER = "111111111111";

export const SET: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

export const recordOf = (taikoNo: string): UndoRecord<CostumeSet> => ({
  taikoNo,
  before: SET,
  after: { ...SET, colorFace: 3 },
  at: "2026-09-27T03:00:00.000Z",
  status: "current",
});

export const pendingOf = (taikoNo: string): PendingUndo<CostumeSet> => ({
  taikoNo,
  before: SET,
  expectedAfter: { ...SET, colorFace: 9 },
  at: "2026-09-27T03:00:00.000Z",
  purpose: "change",
});

export const SLOT: UndoSlot<CostumeSet> = { record: recordOf(PLAYER), pending: null };

export const TITLE: TitleState = { title: "サンプルの称号" };

export const titleRecordOf = (taikoNo: string): UndoRecord<TitleState> => ({
  taikoNo,
  before: TITLE,
  after: { title: "別のサンプル称号" },
  at: "2026-09-27T03:00:00.000Z",
  status: "current",
});

export const titlePendingOf = (taikoNo: string): PendingUndo<TitleState> => ({
  taikoNo,
  before: TITLE,
  expectedAfter: { title: "三つ目のサンプル称号" },
  at: "2026-09-27T03:00:00.000Z",
  purpose: "change",
});

export const TITLE_SLOT: UndoSlot<TitleState> = { record: titleRecordOf(PLAYER), pending: null };

export const NAME: NameState = { nickname: "サンプルどん" };

export const nameRecordOf = (taikoNo: string): UndoRecord<NameState> => ({
  taikoNo,
  before: NAME,
  after: { nickname: "あたらしい" },
  at: "2026-09-27T03:00:00.000Z",
  status: "current",
});

export const namePendingOf = (taikoNo: string): PendingUndo<NameState> => ({
  taikoNo,
  before: NAME,
  expectedAfter: { nickname: "みっつめ" },
  at: "2026-09-27T03:00:00.000Z",
  purpose: "change",
});

export const NAME_SLOT: UndoSlot<NameState> = { record: nameRecordOf(PLAYER), pending: null };
