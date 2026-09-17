import { describe, expect, it } from 'vitest';
import { base62Encode } from './base62.js';

describe('base62Encode', () => {
    it('encodes zero as the first alphabet character', () => {
        expect(base62Encode(0n)).toBe('0');
    });

    it('encodes small values', () => {
        expect(base62Encode(61n)).toBe('z');
        expect(base62Encode(62n)).toBe('10');
    });

    it('round-trips through decoding for a range of values', () => {
        const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const decode = (s: string) =>
            [...s].reduce((acc, ch) => acc * 62n + BigInt(ALPHABET.indexOf(ch)), 0n);

        for (const value of [1n, 100n, 123456789n, 9007199254740991n]) {
            expect(decode(base62Encode(value))).toBe(value);
        }
    });

    it('never produces characters outside the Base62 alphabet', () => {
        const encoded = base62Encode(123456789012345n);
        expect(encoded).toMatch(/^[0-9A-Za-z]+$/);
    });
});
