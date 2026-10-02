/**
 * What the tests of Android's port share: Hiroba's origin as the port holds it, a my page it can
 * read, and the page's signed-in flag kept in memory.
 */
import { expect } from "bun:test";

import { nativeBase64 } from "./capacitor-fakes";

export const HIROBA = "https://donderhiroba.jp";
export const CLOSE_LABEL = "Close sign-in";
/**
 * A dan-less my page, so a read is one request: the title plate, bare as Hiroba writes it, over
 * the title. Placeholders throughout, no real account's.
 */
export const MY_PAGE = `<html><body><div id="mydon_area">
  <img src="imgsrc_titleplate.php" style="width: 100%;">
  <div>サンプルの称号</div>
  <div style="height:24px;">サンプルどん</div>
  <div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div></div>
  <div class="total_score"><img src="image/sp/640/total_score_image_5.png">
    ${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
    <div class="silver_crown_count">1</div><div class="gold_crown_count">1</div>
    <div class="donderful_crown_count">1</div></div>
</div>
<div class="favoriteSong"><h2>大好きな曲</h2><ul><li><span class="songName">未設定</span></li></ul></div>
<div class="favoriteSong"><h2>お気に入りの曲</h2><ul></ul></div></body></html>`;
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
