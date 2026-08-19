/**
 * Float32Array ↔ BLOB bytes, little-endian (every target device is LE).
 * Always copies: better-sqlite3 hands back Buffers whose byteOffset may not be
 * 4-aligned, and a Float32Array view over an unaligned buffer throws.
 */

export function encodeVector(v: Float32Array): Uint8Array {
  const copy = Float32Array.from(v);
  return new Uint8Array(copy.buffer);
}

export function decodeVector(bytes: Uint8Array, dim: number): Float32Array {
  if (bytes.byteLength !== dim * 4) {
    throw new Error(`embedding blob is ${bytes.byteLength} bytes, expected ${dim * 4} (dim ${dim})`);
  }
  const aligned = new Uint8Array(bytes.byteLength);
  aligned.set(bytes);
  return new Float32Array(aligned.buffer);
}

/**
 * Driver blob format: better-sqlite3 only binds Buffer, expo-sqlite takes
 * Uint8Array (React Native has no Buffer). Zero-copy view either way.
 */
export function toDriverBlob(bytes: Uint8Array): Uint8Array {
  const BufferCtor = (globalThis as { Buffer?: { from(a: ArrayBufferLike, o: number, l: number): Uint8Array } })
    .Buffer;
  return BufferCtor ? BufferCtor.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) : bytes;
}
