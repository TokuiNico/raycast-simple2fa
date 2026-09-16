import { createHmac } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export type TotpAlgorithm = "SHA1" | "SHA256" | "SHA512";

export type TotpParams = {
  secret: string;
  digits?: number;
  period?: number;
  algorithm?: TotpAlgorithm;
};

export const DEFAULT_DIGITS = 6;
export const DEFAULT_PERIOD = 30;
export const DEFAULT_ALGORITHM: TotpAlgorithm = "SHA1";

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of cleaned) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

export function secondsRemaining(period = DEFAULT_PERIOD, now = Date.now()): number {
  const elapsed = Math.floor(now / 1000) % period;
  return period - elapsed;
}

export function generateTotp(params: TotpParams, now = Date.now()): string {
  const digits = params.digits ?? DEFAULT_DIGITS;
  const period = params.period ?? DEFAULT_PERIOD;
  const algorithm = params.algorithm ?? DEFAULT_ALGORITHM;

  const counter = Math.floor(now / 1000 / period);
  const message = counterBytes(counter);

  const digest = createHmac(algorithm.toLowerCase(), base32Decode(params.secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, "0");
}

// Tinycast's `buffer` shim has no writeUInt32BE, so the counter is filled in
// byte by byte. Division rather than shifting, because a counter can pass 2^32.
function counterBytes(counter: number): Buffer {
  const bytes = Buffer.alloc(8);
  let remaining = counter;
  for (let index = 7; index >= 0; index--) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}
