import { describe, expect, it } from 'vitest';

import { crc32, zipStore } from '../zip';

const enc = new TextEncoder();

/** Read a little-endian uint32 at offset. */
function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

describe('crc32', () => {
  it('matches the standard check vectors', () => {
    expect(crc32(enc.encode(''))).toBe(0);
    // "123456789" → 0xCBF43926 (the canonical CRC-32 check value).
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });

  it('is deterministic', () => {
    const data = enc.encode('Tiếng Việt có dấu');
    expect(crc32(data)).toBe(crc32(data));
  });
});

describe('zipStore', () => {
  const zip = zipStore([
    { name: 'a.txt', data: enc.encode('hello') },
    { name: 'dir/b.txt', data: enc.encode('Xin chào') },
  ]);

  it('starts with the local-file-header signature (PK\\x03\\x04)', () => {
    expect(u32(zip, 0)).toBe(0x04034b50);
  });

  it('ends with an EOCD record listing every entry', () => {
    const eocdSig = 0x06054b50;
    // EOCD is the last 22 bytes (no archive comment).
    const eocdOffset = zip.length - 22;
    expect(u32(zip, eocdOffset)).toBe(eocdSig);
    // total entries (offset +10, uint16)
    const total = new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint16(
      eocdOffset + 10,
      true,
    );
    expect(total).toBe(2);
  });

  it('is deterministic (fixed timestamp → identical bytes)', () => {
    const again = zipStore([
      { name: 'a.txt', data: enc.encode('hello') },
      { name: 'dir/b.txt', data: enc.encode('Xin chào') },
    ]);
    expect(Array.from(again)).toEqual(Array.from(zip));
  });
});
