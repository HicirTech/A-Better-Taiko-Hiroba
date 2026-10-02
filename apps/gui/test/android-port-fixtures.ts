/**
 * What the tests of Android's port share: Hiroba's origin as the port holds it, a my page it can
 * read, and the page's signed-in flag kept in memory.
 */
import { expect } from "bun:test";

import { escapeHtml, type ProfileEditor } from "../scripts/mock-profile";
import { nativeBase64 } from "./capacitor-fakes";

export const HIROBA = "https://donderhiroba.jp";
export const CLOSE_LABEL = "Close sign-in";
/** What varies between the my pages the tests read: the title, the name, whose it is, the dialog. */
interface MyPageParts {
  /** The title, as the page's text holds it. */
  readonly title: string;
  readonly nickname: string;
  readonly taikoNo: string;
  /** The page's script, which carries the flag for renaming. */
  readonly head: string;
  /** The rename dialog at the page's foot. */
  readonly dialog: string;
}

const myPageWith = ({
  title,
  nickname,
  taikoNo,
  head,
  dialog,
}: MyPageParts) => `<html>${head === "" ? "" : `<head>${head}</head>`}<body><div id="mydon_area">
  <img src="imgsrc_titleplate.php" style="width: 100%;">
  <div>${title}</div>
  <div style="height:24px;">${nickname}</div>
  <div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：${taikoNo}</p></div></div>
  <div class="total_score"><img src="image/sp/640/total_score_image_5.png">
    ${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
    <div class="silver_crown_count">1</div><div class="gold_crown_count">1</div>
    <div class="donderful_crown_count">1</div></div>
</div>
<div class="favoriteSong"><h2>大好きな曲</h2><ul><li><span class="songName">未設定</span></li></ul></div>
<div class="favoriteSong"><h2>お気に入りの曲</h2><ul></ul></div>${dialog}</body></html>`;

/**
 * A dan-less my page, so a read is one request: the title plate, bare as Hiroba writes it, over
 * the title. Placeholders throughout, no real account's.
 */
export const MY_PAGE = myPageWith({
  title: "サンプルの称号",
  nickname: "サンプルどん",
  taikoNo: "000000000000",
  head: "",
  dialog: "",
});

/**
 * My page as the profile the stand-in keeps shows it: wearing its title and its name, with the
 * rename dialog carrying the token the read has just been given, and whose it is.
 */
export const profilePage =
  (profile: ProfileEditor, taikoNo = "000000000000") =>
  (ticket: string) =>
    myPageWith({
      title: escapeHtml(profile.title()),
      nickname: escapeHtml(profile.nickname()),
      taikoNo,
      head: profile.renameScript(),
      dialog: profile.renameDialog(ticket),
    });
/** My page as Hiroba answers it, whatever was asked. */
export const myPageAnswer = async () => ({
  status: 200,
  url: `${HIROBA}/mypage_top.php`,
  headers: { "Content-Type": "text/html; charset=UTF-8" },
  data: nativeBase64(MY_PAGE),
});

/** A signed-in flag in memory, in place of the page's localStorage. */
export function memoryFlag(initial = false) {
  let value = initial;
  return {
    get: () => value,
    set: (next: boolean) => {
      value = next;
    },
  };
}

export async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; tries < 100 && !condition(); tries++) {
    await Bun.sleep(1);
  }
  expect(condition()).toBe(true);
}
