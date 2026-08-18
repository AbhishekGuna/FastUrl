const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function base62Encode(value: bigint): string {
  if (value === 0n) return ALPHABET[0];

  let remaining = value;
  const base = BigInt(ALPHABET.length);
  let out = "";

  while (remaining > 0n) {
    out = ALPHABET[Number(remaining % base)] + out;
    remaining /= base;
  }

  return out;
}
