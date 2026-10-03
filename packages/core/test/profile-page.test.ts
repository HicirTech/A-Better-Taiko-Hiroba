import { describe, expect, test } from "bun:test";

import {
  isErr,
  isOk,
  type MedalUnrecognisedReason,
  parseProfilePage,
  type Profile,
} from "../src/index";

interface ExcerptOptions {
  withDan: boolean;
  /** The name row as one flat div with the nickname, as user_profile.php writes a dan-less one. */
  flatNameRow?: boolean;
  /** null renders the block the way the page renders an unset 大好きな曲. */
  favoriteSong?: { songNo: string; title: string } | null;
  folderTitles?: readonly string[];
  /** Neither favourite block, as a page whose shape changed under the parser. */
  withoutFavoriteBlocks?: boolean;
  /** The flag the script hands the rename dialog, "0" unless said; `null` leaves the call out. */
  renameFlag?: string | null;
}

const DEFAULT_FAVORITE = { songNo: "1346", title: "サンプル曲アルファ" };
const DEFAULT_FOLDER = ["サンプル曲ベータ", "サンプル曲ガンマ", "サンプル曲デルタ"];

/** 未設定 is the only text with a suffix-less `songNameFont`, and it comes with an empty `song_no`. */
function favoriteSongBlock(song: { songNo: string; title: string } | null): string {
  return `
  <div class="favoriteSong">
    <form name="favorite_song" method="GET" action="mypage_top.php">
      <input type="hidden" name="list_type" value="">
      <h2 class="subtitleMypage">大好きな曲</h2>
      <div class="mypageInfoArea">
        <ul id="songList" style="clear:both;">
          <li class="contentBox songLisrArea mypageSongListArea">
            <div class="songNameArea clearfix">
              <div class="name"><span class="songName ${song === null ? "songNameFont" : "songNameFontnamco"}">${song?.title ?? "未設定"}</span></div>
            </div>
          </li>
        </ul>
        <input type="hidden" name="song_no" id="song_no" value="${song?.songNo ?? ""}">
        <div class="buttonParentArea buttonChange">
          <a href="portal_favorite_song_select.php">
            <div class="buttonLabel shadowLabel">設定する</div>
          </a>
        </div>
      </div>
    </form>
  </div>`;
}

/** The お気に入りの曲 folder: same class, same list id, titles padded with the page's own tabs. */
function favoriteFolderBlock(titles: readonly string[]): string {
  const items = titles
    .map(
      (title) => `
          <li class="contentBox songLisrAreanamco mypageSongListArea">
            <div class="songNameArea clearfix">
              <span class="songName songNameFontnamco">
              ${title}\t\t\t\t</span>
            </div>
          </li>`,
    )
    .join("");
  return `
  <div class="favoriteSong">
    <h2 class="subtitleMypage">お気に入りの曲</h2>
    <div class="mypageInfoArea">
      <ul id="songList" style="clear:both;">${items}
      </ul>
      <div class="buttonParentArea buttonChange">
        <a href="favorite_song_select.php?init=1">
          <div class="buttonLabel shadowLabel">設定する</div>
        </a>
      </div>
    </div>
  </div>`;
}

function profileExcerpt(options: ExcerptOptions): string {
  const dan = options.withDan
    ? `<img src="imgsrc_danlabel.php?taiko_no=000000000000" style="height:21px;">`
    : "";
  const favorites = options.withoutFavoriteBlocks
    ? ""
    : favoriteSongBlock(
        options.favoriteSong === undefined ? DEFAULT_FAVORITE : options.favoriteSong,
      ) + favoriteFolderBlock(options.folderTitles ?? DEFAULT_FOLDER);
  const nameRow = options.flatNameRow
    ? `<div style="height:24px;text-align:center;">
    Donder\t\t</div>`
    : `<div style="display:flex">
    <div style="width:135px;">Donder</div>
    <div style="width:135px;text-align:center">${dan}</div>
  </div>`;
  const renameFlag = options.renameFlag === undefined ? "0" : options.renameFlag;
  const script =
    renameFlag === null
      ? ""
      : `<script type="text/javascript">
jQuery(function($){
	$( '#rename_img' ).rename( '#dialog', 'Donder', $( '#_tckt' ).val(),  '${renameFlag}' );
	$( '.rename_label' ).rename( '#dialog', 'Donder', $( '#_tckt' ).val(),  '${renameFlag}' );
});
</script>`;
  return `
<html><head>${script}</head><body>
<div id="mydon_area" class="mydon_area">
  <img src="imgsrc_titleplate.php">
  <div style="height: 20px;text-align: center;">黒薔薇の使徒</div>
  ${nameRow}
  <div style="background-color:#FC0;">
    <div class="detail">
      <p>国・地域 ：香港</p>
      <p>太鼓番：000000000000</p>
    </div>
    <div class="mydon_image">
      <img class="customd_mydon" src="https://img.example/imgsrc.php?kind=mydon&fn=mydon_000000000000">
    </div>
  </div>
  <div class="total_score">
    <img src="image/sp/640/total_score_image_5.png">
    <div class="best_rank_score_8 total_panel_display">5</div>
    <div class="best_rank_score_7 total_panel_display">30</div>
    <div class="best_rank_score_6 total_panel_display">52</div>
    <div class="best_rank_score_5 total_panel_display">40</div>
    <div class="best_rank_score_4 total_panel_display">25</div>
    <div class="best_rank_score_3 total_panel_display">11</div>
    <div class="best_rank_score_2 total_panel_display">4</div>
    <div class="silver_crown_count total_panel_crown_display">464</div>
    <div class="gold_crown_count total_panel_crown_display">316</div>
    <div class="donderful_crown_count total_panel_crown_display">0</div>
  </div>${MEDAL_PLATE}
</div>${favorites}
</body></html>`;
}

/** A plate's picture as my page writes it: an opaque 48-character hex id. */
const PLATE_IMAGE = "imgsrc_tokenplate.php?id=0123456789abcdef0123456789abcdef0123456789abcdef";
const MEDAL_PLATE = `
  <div>
    <img src="${PLATE_IMAGE}" style="width: 100%;">
    <div class="token_name token_info_display">どんメダル2026夏</div>
    <div class="token_count token_info_display">0</div>
  </div>`;
const NAME_LINE = `<div class="token_name token_info_display">どんメダル2026夏</div>`;
const COUNT_LINE = `<div class="token_count token_info_display">0</div>`;
/** The plate of a complete set: COMPLETE where the count was, and no count at all. */
const completeLine = (label: string) =>
  `<div class="token_complete token_info_display">\n\t\t\t\t\t${label}\n\t\t\t\t</div>`;

const FETCHED_AT = "2026-07-26T12:00:00.000Z";

describe("parseProfilePage", () => {
  test("parses a complete profile, summary counts as Hiroba's own numbers", () => {
    const result = parseProfilePage(profileExcerpt({ withDan: true }), FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    const expected: Profile = {
      taikoNo: "000000000000",
      nickname: "Donder",
      rename: "open",
      title: "黒薔薇の使徒",
      region: "香港",
      titlePlateImageUrl: "imgsrc_titleplate.php",
      danLabelImageUrl: "imgsrc_danlabel.php?taiko_no=000000000000",
      medal: {
        name: "どんメダル2026夏",
        progress: { kind: "collecting", count: 0 },
        plateImageUrl: PLATE_IMAGE,
      },
      myDonImageUrl: "https://img.example/imgsrc.php?kind=mydon&fn=mydon_000000000000",
      favoriteSong: { songNo: "1346", title: "サンプル曲アルファ" },
      favoriteFolderTitles: ["サンプル曲ベータ", "サンプル曲ガンマ", "サンプル曲デルタ"],
      summary: {
        countLevel: 5,
        crownCounts: { silver: 464, gold: 316, donderful: 0 },
        rankCounts: { 2: 4, 3: 11, 4: 25, 5: 40, 6: 52, 7: 30, 8: 5 },
      },
      fetchedAt: FETCHED_AT,
    };
    expect(result.value).toEqual(expected);
  });

  describe("a medal set that is complete", () => {
    test("reads as complete, with no count — absent, not zero", () => {
      const page = profileExcerpt({ withDan: true }).replace(COUNT_LINE, completeLine("COMPLETE"));
      const result = parseProfilePage(page, FETCHED_AT);

      if (!isOk(result)) {
        throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
      }
      expect(result.value.medal).toEqual({
        name: "どんメダル2026夏",
        progress: { kind: "complete" },
        plateImageUrl: PLATE_IMAGE,
      });
    });
  });

  describe("a どんメダル plate of a new shape", () => {
    const cases: readonly [string, string, string, MedalUnrecognisedReason, string][] = [
      [
        "an empty name",
        NAME_LINE,
        `<div class="token_name token_info_display"> </div>`,
        "emptyName",
        "",
      ],
      ["neither a count nor COMPLETE", COUNT_LINE, "", "noCountNoComplete", "どんメダル2026夏"],
      [
        "a count that is not a number",
        COUNT_LINE,
        `<div class="token_count token_info_display">ほぼ</div>`,
        "countNotNumber",
        "どんメダル2026夏",
      ],
      [
        "other text where COMPLETE goes",
        COUNT_LINE,
        completeLine("ほぼ完成"),
        "completeLabelOther",
        "どんメダル2026夏",
      ],
      [
        "both a count and COMPLETE",
        COUNT_LINE,
        `${COUNT_LINE}${completeLine("COMPLETE")}`,
        "countAndComplete",
        "どんメダル2026夏",
      ],
    ];

    for (const [shape, from, to, reason, name] of cases) {
      test(`${shape} reads as unrecognised, ${reason}, and the rest of the page still reads`, () => {
        const withPlate = profileExcerpt({ withDan: true });
        const page = withPlate.replace(from, to);
        expect(page).not.toBe(withPlate);

        const result = parseProfilePage(page, FETCHED_AT);

        if (!isOk(result)) {
          throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
        }
        expect(result.value.medal).toEqual({
          name,
          progress: { kind: "unrecognised", reason },
          plateImageUrl: PLATE_IMAGE,
        });
        expect(result.value.nickname).toBe("Donder");
        expect(result.value.title).toBe("黒薔薇の使徒");
        expect(result.value.summary.crownCounts).toEqual({ silver: 464, gold: 316, donderful: 0 });
        expect(result.value.summary.rankCounts[8]).toBe(5);
        expect(result.value.favoriteFolderTitles).toHaveLength(3);
      });
    }

    test("keeps a code for what did not read, never the page's text there", () => {
      const page = profileExcerpt({ withDan: true }).replace(COUNT_LINE, completeLine("ほぼ完成"));
      expect(JSON.stringify(parseProfilePage(page, FETCHED_AT))).not.toContain("ほぼ完成");
    });
  });

  // Never seen on my page, but nothing says a plate is always there; another player's has none.
  test("no どんメダル plate is a normal state, read as no medal", () => {
    const withPlate = profileExcerpt({ withDan: true });
    const excerpt = withPlate.replace(MEDAL_PLATE, "");
    expect(excerpt).not.toBe(withPlate);

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.medal).toBeNull();
    expect(result.value.nickname).toBe("Donder");
    expect(result.value.summary.crownCounts).toEqual({ silver: 464, gold: 316, donderful: 0 });
  });

  test("a plate whose picture is missing keeps its name and count, and no picture", () => {
    const withPicture = profileExcerpt({ withDan: true });
    const excerpt = withPicture.replace(`<img src="${PLATE_IMAGE}" style="width: 100%;">`, "");
    expect(excerpt).not.toBe(withPicture);

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.medal).toEqual({
      name: "どんメダル2026夏",
      progress: { kind: "collecting", count: 0 },
      plateImageUrl: null,
    });
  });

  test("no dan is a normal state, not a failure", () => {
    const result = parseProfilePage(profileExcerpt({ withDan: false }), FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.danLabelImageUrl).toBeNull();
  });

  // No dan-less my page has been captured; user_profile.php, in the same markup, writes every
  // dan-less player this way.
  test("a dan-less name row that is one flat div still gives the nickname", () => {
    const result = parseProfilePage(
      profileExcerpt({ withDan: false, flatNameRow: true }),
      FETCHED_AT,
    );

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.nickname).toBe("Donder");
    expect(result.value.danLabelImageUrl).toBeNull();
  });

  test("keeps the title plate's src as the page writes it, a query included", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<img src="imgsrc_titleplate.php">`,
      `<img src="imgsrc_titleplate.php?taiko_no=000000000000" style="width: 100%;">`,
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.titlePlateImageUrl).toBe("imgsrc_titleplate.php?taiko_no=000000000000");
  });

  test("no title plate is read as null, and the rest of the page still reads", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<img src="imgsrc_titleplate.php">`,
      "",
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.titlePlateImageUrl).toBeNull();
    expect(result.value.title).toBe("黒薔薇の使徒");
    expect(result.value.nickname).toBe("Donder");
  });

  test("an empty title line is no title, a normal state, read as an empty string", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<div style="height: 20px;text-align: center;">黒薔薇の使徒</div>`,
      `<div style="height: 20px;text-align: center;">\n\t\t\t</div>`,
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.title).toBe("");
    expect(result.value.nickname).toBe("Donder");
  });

  describe("whether Hiroba takes a rename", () => {
    type FlagCase = [label: string, renameFlag: string | null, expected: Profile["rename"]];
    test.each<FlagCase>([
      ["flag 0", "0", "open"],
      ["flag 1", "1", "closed"],
      ["no flag", null, "unknown"],
      ["a flag of another value", "x", "unknown"],
    ])("reads %s as %s, and the rest of the page still reads", (_label, renameFlag, expected) => {
      const result = parseProfilePage(profileExcerpt({ withDan: true, renameFlag }), FETCHED_AT);

      if (!isOk(result)) {
        throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
      }
      expect(result.value.rename).toBe(expected);
      expect(result.value.nickname).toBe("Donder");
    });
  });

  test("a region that reads 未設定 is no region, read as null", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      "<p>国・地域 ：香港</p>",
      "<p>都道府県 ：未設定</p>",
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.region).toBeNull();
  });

  test("a page without its title line fails, rather than read the name row as the title", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<div style="height: 20px;text-align: center;">黒薔薇の使徒</div>`,
      "",
    );

    expect(parseProfilePage(excerpt, FETCHED_AT)).toEqual({
      ok: false,
      error: {
        kind: "missingMarker",
        page: "mypage_top.php",
        marker: "#mydon_area > div (.detail after the name row)",
      },
    });
  });

  test("an unset 大好きな曲 is a normal state, read as null", () => {
    const result = parseProfilePage(
      profileExcerpt({ withDan: true, favoriteSong: null }),
      FETCHED_AT,
    );

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.favoriteSong).toBeNull();
  });

  test("an empty お気に入り folder is a normal state, read as an empty list", () => {
    const result = parseProfilePage(
      profileExcerpt({ withDan: true, folderTitles: [] }),
      FETCHED_AT,
    );

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.favoriteFolderTitles).toEqual([]);
  });

  test("the folder keeps page order and reads titles only", () => {
    const titles = ["サンプル曲1", "サンプル曲2", "サンプル曲3", "サンプル曲4", "サンプル曲5"];

    const result = parseProfilePage(
      profileExcerpt({ withDan: true, folderTitles: titles }),
      FETCHED_AT,
    );

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.favoriteFolderTitles).toEqual(titles);
  });

  // My page always fills the input for a set song: this is pinned as tolerance, not a known shape.
  test("a title arriving without its number is kept rather than dropped", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<input type="hidden" name="song_no" id="song_no" value="1346">`,
      `<input type="hidden" name="song_no" id="song_no" value="">`,
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.favoriteSong).toEqual({ songNo: null, title: "サンプル曲アルファ" });
  });

  test("a logged-in page without the favourite blocks fails naming the missing one", () => {
    const result = parseProfilePage(
      profileExcerpt({ withDan: true, withoutFavoriteBlocks: true }),
      FETCHED_AT,
    );

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "mypage_top.php",
      marker: "div.favoriteSong (大好きな曲)",
    });
  });

  test("the folder block missing fails as itself, not as the 大好きな曲 block", () => {
    const excerpt = profileExcerpt({ withDan: true }).replace(
      `<h2 class="subtitleMypage">お気に入りの曲</h2>`,
      "",
    );

    const result = parseProfilePage(excerpt, FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "mypage_top.php",
      marker: "div.favoriteSong (お気に入りの曲)",
    });
  });

  test("a page without #mydon_area fails naming that marker", () => {
    const result = parseProfilePage("<html><body><p>maintenance</p></body></html>", FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "mypage_top.php",
      marker: "#mydon_area",
    });
  });

  test("a crown count that is not a number fails as unreadable, carrying the raw text", () => {
    const broken = profileExcerpt({ withDan: true }).replace(
      `<div class="gold_crown_count total_panel_crown_display">316</div>`,
      `<div class="gold_crown_count total_panel_crown_display">—</div>`,
    );

    const result = parseProfilePage(broken, FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "mypage_top.php",
      marker: ".gold_crown_count",
      raw: "—",
    });
  });

  test("a logged-out answer fails as loggedOut, not as missing fields", () => {
    const loginPage = `<html><body>
      <form name="login_form" id="login_form" method="get" action="./login_process.php"></form>
    </body></html>`;

    const result = parseProfilePage(loginPage, FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error.kind).toBe("loggedOut");
  });
});
