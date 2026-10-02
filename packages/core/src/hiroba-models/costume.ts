/**
 * The My Don costume from `mypage_kisekae.php` — the same page later takes the write, so the
 * shape is read and written unchanged. Values are what the hidden fields carry; a missing field
 * is a parse failure, never a substituted default.
 */
export interface Costume extends CostumeSet {
  readonly taikoNo: string;
  readonly fetchedAt: string;
}

/**
 * The eight values a costume is, as one set: three colours, and the item in each of the five
 * slots, 0 for none. A costume write sends the whole set and reads the whole set back, because the
 * server changes slots the body did not mean to: equipping a きぐるみ (`costume1`) empties the four
 * pieces whatever the body said.
 */
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
