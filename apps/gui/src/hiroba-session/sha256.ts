// Own SHA-256: the window has no node:crypto, and Android's live reload page has no crypto.subtle.

/** The first 32 bits of the fractional parts of the cube roots of the first 64 primes (4.2.2). */
const ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

type Words = [number, number, number, number, number, number, number, number];

/** The first 32 bits of the fractional parts of the square roots of the first 8 primes (5.3.3). */
const INITIAL_HASH: Readonly<Words> = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const BLOCK_BYTES = 64;
/** The 1 bit after the message, and the 64-bit length after that. */
const PADDING_BYTES = 1 + 8;

const rotateRight = (word: number, bits: number) => (word >>> bits) | (word << (32 - bits));

/** The SHA-256 of `text`'s UTF-8 bytes, in lower-case hex. */
export function sha256Hex(text: string): string {
  const message = new TextEncoder().encode(text);
  const padded = new Uint8Array(
    Math.ceil((message.length + PADDING_BYTES) / BLOCK_BYTES) * BLOCK_BYTES,
  );
  padded.set(message);
  padded[message.length] = 0x80;
  const blocks = new DataView(padded.buffer);
  const bits = message.length * 8;
  blocks.setUint32(padded.length - 8, Math.floor(bits / 2 ** 32));
  blocks.setUint32(padded.length - 4, bits >>> 0);

  let hash: Words = [...INITIAL_HASH];
  for (let offset = 0; offset < padded.length; offset += BLOCK_BYTES) {
    hash = compress(hash, blocks, offset);
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

/** The hash after the 64-byte block at `offset` (6.2.2). */
function compress(hash: Words, blocks: DataView, offset: number): Words {
  const schedule = new DataView(new ArrayBuffer(ROUND_CONSTANTS.length * 4));
  const wordAt = (t: number) => schedule.getUint32(t * 4);
  for (let t = 0; t < 16; t++) {
    schedule.setUint32(t * 4, blocks.getUint32(offset + t * 4));
  }
  for (let t = 16; t < ROUND_CONSTANTS.length; t++) {
    const early = wordAt(t - 15);
    const late = wordAt(t - 2);
    const s0 = rotateRight(early, 7) ^ rotateRight(early, 18) ^ (early >>> 3);
    const s1 = rotateRight(late, 17) ^ rotateRight(late, 19) ^ (late >>> 10);
    // setUint32 keeps the sum modulo 2^32.
    schedule.setUint32(t * 4, wordAt(t - 16) + s0 + wordAt(t - 7) + s1);
  }

  let [a, b, c, d, e, f, g, h] = hash;
  for (const [t, constant] of ROUND_CONSTANTS.entries()) {
    const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
    const choice = (e & f) ^ (~e & g);
    const t1 = h + s1 + choice + constant + wordAt(t);
    const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    h = g;
    g = f;
    f = e;
    e = (d + t1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + s0 + majority) >>> 0;
  }
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hash;
  return [
    (h0 + a) >>> 0,
    (h1 + b) >>> 0,
    (h2 + c) >>> 0,
    (h3 + d) >>> 0,
    (h4 + e) >>> 0,
    (h5 + f) >>> 0,
    (h6 + g) >>> 0,
    (h7 + h) >>> 0,
  ];
}
