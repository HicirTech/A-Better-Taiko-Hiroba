/**
 * The My Don costume from `mypage_kisekae.php` — the same page later takes the write, so the
 * shape is read and written unchanged. Values are what the hidden fields carry; a missing field
 * is a parse failure, never a substituted default.
 */
export interface Costume {
  readonly taikoNo: string;
  readonly colorBody: number;
  readonly colorLimb: number;
  readonly colorFace: number;
  readonly costume1: number;
  readonly costume2: number;
  readonly costume3: number;
  readonly costume4: number;
  readonly costume5: number;
  readonly fetchedAt: string;
}
