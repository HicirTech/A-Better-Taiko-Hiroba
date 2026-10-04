/** The song list the stand-in serves as taiko.wiki's, in the wiki's own shape. */

export type WikiGenre =
  | "pops"
  | "anime"
  | "kids"
  | "vocaloid"
  | "game"
  | "namco"
  | "variety"
  | "classic";

export interface WikiCourse {
  readonly level: number;
  readonly maxCombo: number;
  readonly isBranched: 0 | 1;
  readonly images: readonly string[];
}

export interface WikiSong {
  readonly songNo: string;
  readonly title: string;
  readonly titleEn: string | null;
  readonly titleZhCN: string | null;
  readonly romaji: string | null;
  readonly artists: readonly string[];
  readonly genre: readonly WikiGenre[];
  readonly bpm: { readonly min: number; readonly max: number };
  readonly bpmShiver: 0 | 1;
  readonly isDeleted: 0 | 1;
  readonly courses: {
    readonly easy: WikiCourse;
    readonly normal: WikiCourse;
    readonly hard: WikiCourse;
    readonly oni: WikiCourse;
    readonly ura: WikiCourse | null;
  };
}

type WikiDifficulty = keyof WikiSong["courses"];

const WIKI_DIFFICULTIES: readonly WikiDifficulty[] = ["easy", "normal", "hard", "oni", "ura"];

type PictureCounts = Readonly<Partial<Record<WikiDifficulty, number>>>;

/** How many pictures each chart of a song has on the stand-in; a chart not named has none. */
const CHART_PICTURES: Readonly<Record<string, PictureCounts>> = {
  "1001": { easy: 1, normal: 1, hard: 1, oni: 1 },
  "1005": { oni: 2, ura: 1 },
  "1019": { oni: 1 },
};

const chartPicturePaths = (songNo: string, difficulty: WikiDifficulty): string[] =>
  Array.from(
    { length: CHART_PICTURES[songNo]?.[difficulty] ?? 0 },
    (_, at) => `/__charts/${songNo}/${difficulty}-${at + 1}.png`,
  );

/** Where the stand-in serves each chart picture, a song's easiest chart first. */
export const CHART_PICTURE_PATHS: readonly string[] = Object.keys(CHART_PICTURES).flatMap(
  (songNo) => WIKI_DIFFICULTIES.flatMap((difficulty) => chartPicturePaths(songNo, difficulty)),
);

type Levels = readonly [easy: number, normal: number, hard: number, oni: number, ura?: number];

interface Extras {
  readonly en?: string;
  readonly zh?: string;
  readonly romaji?: string;
  /** The lowest and highest BPM; 150 throughout when not given. */
  readonly bpm?: readonly [min: number, max: number];
  readonly wobbles?: boolean;
  readonly branched?: boolean;
}

const STEADY_BPM = [150, 150] as const;
const COMBO_PER_LEVEL = 100;

const course = (level: number, branched = false): WikiCourse => ({
  level,
  maxCombo: level * COMBO_PER_LEVEL,
  isBranched: branched ? 1 : 0,
  images: [],
});

function wikiSong(
  songNo: string,
  title: string,
  artist: string,
  genre: readonly WikiGenre[],
  [easy, normal, hard, oni, ura]: Levels,
  extras: Extras = {},
): WikiSong {
  const [min, max] = extras.bpm ?? STEADY_BPM;
  return {
    songNo,
    title,
    titleEn: extras.en ?? null,
    titleZhCN: extras.zh ?? null,
    romaji: extras.romaji ?? null,
    artists: [artist],
    genre,
    bpm: { min, max },
    bpmShiver: extras.wobbles ? 1 : 0,
    isDeleted: 0,
    courses: {
      easy: course(easy),
      normal: course(normal),
      hard: course(hard),
      oni: course(oni, extras.branched),
      ura: ura === undefined ? null : course(ura),
    },
  };
}

const WHITE_FLOWERS = wikiSong("1003", "白い季節に咲く花", "青い栞", ["pops"], [2, 4, 6, 8], {
  en: "Flowers of the White Season",
  zh: "盛开在白色季节的花",
});

/** Taken off the game: Hiroba has no such song, and the wiki lists it as deleted. */
const DELETED_SONG: WikiSong = {
  ...wikiSong("1039", "配信終了のサンプル曲", "ハルカゼ", ["pops"], [2, 3, 5, 7]),
  isDeleted: 1,
};

/** Two songs share a title, as some of the real ones do; their genres tell them apart. */
export const WIKI_SONGS: readonly WikiSong[] = [
  wikiSong("1001", "夜明けのスケッチ", "ハルカゼ", ["pops"], [2, 3, 5, 7], {
    en: "Sketch at Dawn",
    zh: "黎明的素描",
    romaji: "yoake no suketchi",
  }),
  wikiSong("1002", "ココロ・ステップ", "RINGO-GO", ["pops"], [1, 3, 4, 6, 8]),
  WHITE_FLOWERS,
  wikiSong("1004", "Sunny Side Up", "the moon rabbits", ["pops"], [2, 3, 5, 7], {
    en: "Sunny Side Up",
    zh: "太阳面朝上",
  }),
  wikiSong("1005", "約束の向こう側", "青い栞", ["pops"], [3, 5, 7, 9, 10], {
    en: "Beyond the Promise",
    zh: "约定的彼端",
    romaji: "yakusoku no mukougawa",
    bpm: [120, 240],
    branched: true,
  }),
  wikiSong("1006", "ひこうき雲のゆくえ", "ハルカゼ", ["pops"], [1, 2, 4, 6], {
    romaji: "hikoukigumo no yukue",
  }),
  wikiSong("1007", "シャボン玉ホリデー", "RINGO-GO", ["pops"], [2, 3, 5, 7], { zh: "肥皂泡假日" }),
  wikiSong("1008", "光の翼 ～Wings of Light～", "星屑ラボ", ["anime"], [3, 4, 6, 8, 10], {
    en: "Wings of Light",
    zh: "光之翼",
  }),
  wikiSong("1009", "ラブリー☆ミラクル大作戦", "Miracle Pocket", ["anime"], [2, 4, 5, 7], {
    en: "Lovely Miracle Operation",
    romaji: "rabu rii mirakuru daisakusen",
  }),
  wikiSong("1010", "勇者たちの行進曲", "星屑ラボ", ["anime"], [3, 5, 7, 9], {
    zh: "勇者们的进行曲",
    bpm: [168, 168],
    wobbles: true,
  }),
  wikiSong("1011", "魔法少女は眠らない", "Miracle Pocket", ["anime"], [2, 3, 5, 7], {
    en: "The Magical Girl Never Sleeps",
    zh: "魔法少女不会入睡",
  }),
  wikiSong("1012", "銀河鉄道スペシャル", "星屑ラボ", ["anime", "vocaloid"], [2, 4, 6, 8, 9]),
  wikiSong("1013", "少年探偵団のテーマ", "小さな劇団", ["anime"], [2, 3, 5, 6]),
  wikiSong("1014", "ひだまりのうた", "キッズ・ガーデン", ["kids"], [1, 2, 3, 5], {
    romaji: "hidamari no uta",
  }),
  wikiSong("1015", "どうぶつ行進曲", "キッズ・ガーデン", ["kids"], [1, 2, 3, 4], {
    en: "Animal March",
  }),
  wikiSong("1016", "おやすみ、おつきさま", "キッズ・ガーデン", ["kids"], [1, 1, 2, 3]),
  wikiSong("1017", "電脳少女の独白", "白鍵P", ["vocaloid"], [3, 5, 7, 9, 10], {
    en: "Monologue of a Cyber Girl",
    zh: "电脑少女的独白",
  }),
  wikiSong("1018", "ネオンの雨に溺れて", "nocturne.wav", ["vocaloid"], [3, 5, 7, 8]),
  wikiSong("1019", "SIGNAL 404", "nocturne.wav", ["vocaloid"], [4, 6, 8, 10], {
    en: "SIGNAL 404",
    bpm: [85.85, 257.5],
  }),
  wikiSong("1020", "あの日の手紙", "白鍵P", ["vocaloid"], [2, 4, 6, 8], { zh: "那天的信" }),
  wikiSong("1021", "ロストタイム・ループ", "白鍵P", ["vocaloid"], [3, 5, 7, 9, 10]),
  wikiSong("1022", "地下迷宮のテーマ", "Pixel Garden", ["game"], [2, 4, 6, 8]),
  wikiSong("1023", "ピクセルの王国", "Pixel Garden", ["game"], [2, 3, 5, 7], {
    en: "Pixel Kingdom",
  }),
  wikiSong("1024", "レトロゲーム・メドレー", "8bit Orchestra", ["game"], [3, 5, 7, 9], {
    zh: "复古游戏串烧",
  }),
  wikiSong("1025", "スペース・ランナー", "8bit Orchestra", ["game", "namco"], [2, 4, 6, 7], {
    en: "Space Runner",
  }),
  wikiSong("1026", "ドンドコ祭りだよ", "サウンドチームΩ", ["namco"], [2, 3, 5, 7]),
  wikiSong("1027", "ばちさばき一直線", "サウンドチームΩ", ["namco"], [3, 5, 7, 9, 10], {
    en: "Drumstick Dash",
  }),
  wikiSong("1028", "みんなでドドンがドン！", "サウンドチームΩ", ["namco"], [1, 2, 4, 5]),
  wikiSong("1029", "和太鼓ロックンロール", "和楽団ドン", ["namco"], [3, 5, 7, 8]),
  wikiSong("1030", "お笑いスペシャルメドレー", "芸人バンド", ["variety"], [2, 3, 5, 7]),
  wikiSong("1031", "ひだまりのうた", "弾き語りユニット", ["variety"], [1, 3, 4, 6]),
  wikiSong("1032", "ご当地音頭 ～ふるさと篇～", "民謡クラブ", ["variety"], [2, 3, 4, 6]),
  wikiSong("1033", "Rock & Roll ドンドン", "The Escape Hatch", ["variety"], [2, 4, 6, 8]),
  wikiSong("1034", "大地のカンタータ", "ミニチュア管弦楽団", ["classic"], [2, 4, 6, 8]),
  wikiSong("1035", "月光のワルツ", "ミニチュア管弦楽団", ["classic"], [2, 3, 5, 7]),
  wikiSong("1036", "祝典序曲 変ホ長調", "ミニチュア管弦楽団", ["classic"], [3, 5, 7, 9, 10], {
    en: "Festival Overture in E-flat Major",
    zh: "庆典序曲 降E大调",
  }),
  wikiSong("1037", "春のセレナーデ", "アンサンブル・ルーナ", ["classic"], [1, 3, 5, 7]),
  wikiSong(
    "1038",
    "かなり長い題名のとても賑やかなサンプル曲 ～お祭り騒ぎのスペシャル・エディション～",
    "ハルカゼ",
    ["pops"],
    [2, 4, 6, 8],
  ),
  DELETED_SONG,
  wikiSong("ns2_sample", "コンソール限定サンプル", "Pixel Garden", ["variety"], [2, 3, 5, 7]),
];

/** What the wiki gives for a read that asks only for the songs changed lately. */
const CHANGED_LATELY: readonly WikiSong[] = [
  { ...WHITE_FLOWERS, titleEn: "Flowers of the White Season (Remastered)" },
  DELETED_SONG,
];

/** The song with the pictures of its charts linked on `origin`, where the stand-in serves them. */
function linkedOn(origin: string, song: WikiSong): WikiSong {
  if (CHART_PICTURES[song.songNo] === undefined) {
    return song;
  }
  const linked = (course: WikiCourse, difficulty: WikiDifficulty): WikiCourse => ({
    ...course,
    images: chartPicturePaths(song.songNo, difficulty).map((path) => `${origin}${path}`),
  });
  const { easy, normal, hard, oni, ura } = song.courses;
  return {
    ...song,
    courses: {
      easy: linked(easy, "easy"),
      normal: linked(normal, "normal"),
      hard: linked(hard, "hard"),
      oni: linked(oni, "oni"),
      ura: ura === null ? null : linked(ura, "ura"),
    },
  };
}

/** The whole list, or the pair a read that names a time gets, its pictures linked on `origin`. */
export function wikiSongsSince(after: string | null, origin: string): readonly WikiSong[] {
  return (after === null ? WIKI_SONGS : CHANGED_LATELY).map((song) => linkedOn(origin, song));
}
