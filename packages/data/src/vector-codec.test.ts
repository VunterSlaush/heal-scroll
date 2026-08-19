import { describe, expect, it } from 'vitest';
import { decodeVector, encodeVector, toDriverBlob } from './vector-codec';

describe('vector codec', () => {
  it('round-trips float values exactly', () => {
    const original = Float32Array.from([0.1, -2.5, 1e-7, 42, 0]);
    const decoded = decodeVector(encodeVector(original), original.length);
    expect([...decoded]).toEqual([...original]);
  });

  it('decodes from an unaligned Buffer slice (better-sqlite3 reality)', () => {
    const original = Float32Array.from([1.5, -3.25, 0.75]);
    const bytes = encodeVector(original);
    // Simulate a driver Buffer whose payload starts at an odd byteOffset.
    const padded = new Uint8Array(bytes.byteLength + 1);
    padded.set(bytes, 1);
    const unaligned = padded.subarray(1);
    expect(unaligned.byteOffset % 4).not.toBe(0);
    expect([...decodeVector(unaligned, 3)]).toEqual([...original]);
  });

  it('throws on a length/dim mismatch', () => {
    const bytes = encodeVector(Float32Array.from([1, 2]));
    expect(() => decodeVector(bytes, 3)).toThrow(/expected 12/);
  });

  it('toDriverBlob is a zero-copy view over the same bytes', () => {
    const bytes = encodeVector(Float32Array.from([7]));
    const blob = toDriverBlob(bytes);
    expect([...blob]).toEqual([...bytes]);
    expect(blob.buffer).toBe(bytes.buffer);
  });
});
