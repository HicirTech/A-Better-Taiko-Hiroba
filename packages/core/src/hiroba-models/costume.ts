/** The My Don costume from `mypage_kisekae.php`; a missing field fails the parse, no default. */
export interface Costume extends CostumeSet {
  readonly taikoNo: string;
  readonly fetchedAt: string;
}

/** One costume, whole: equipping a きぐるみ (`costume1`) empties the four pieces whatever is sent. */
export interface CostumeSet {
  readonly colorBody: number;
  readonly colorLimb: number;
  readonly colorFace: number;
  /** The きぐるみ, a whole-body suit. */
  readonly costume1: number;
  /** あたま. */
  readonly costume2: number;
  /** からだ. */
  readonly costume3: number;
  /** メイク. */
  readonly costume4: number;
  /** ぷちキャラ. */
  readonly costume5: number;
}
