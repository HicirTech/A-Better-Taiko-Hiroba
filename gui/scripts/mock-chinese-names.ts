/** The Chinese wiki's API as the stand-in serves it: song pages in two batches, in MediaWiki's shape. */

const songbox = (official: string) =>
  `{{Songbox\n|id = sample\n|official = ${official}\n|genre = POPS\n}}\n'''sample'''`;

const page = (title: string, content: string) => ({
  title,
  revisions: [{ slots: { main: { contentmodel: "wikitext", content } } }],
});

const SECOND_BATCH = "page|2|1014";

const BATCHES = [
  {
    pages: [
      page("光の翼 ～Wings of Light～", songbox("光之翼")),
      page("魔法少女は眠らない", songbox("魔法少女不會入睡")),
      page("電脳少女の独白", songbox("電腦少女的獨白<ref>譯名。</ref>")),
    ],
    next: { gcmcontinue: SECOND_BATCH, continue: "gcmcontinue||" },
  },
  {
    pages: [
      page("ひだまりのうた", songbox("向陽之歌")),
      page("地下迷宮のテーマ", songbox("地下迷宮的主題<br>Dungeon Theme")),
      page("曲ID", "本文"),
    ],
    next: null,
  },
];

/** The batch the query's continuation asks for: the first without one. */
export function chineseNamesBatch(continuation: string | null) {
  const batch = continuation === SECOND_BATCH ? BATCHES[1] : BATCHES[0];
  return {
    batchcomplete: true,
    ...(batch?.next === null || batch === undefined ? {} : { continue: batch.next }),
    query: { pages: batch?.pages ?? [] },
  };
}
