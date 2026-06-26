// M7 — Minimal "store" (uncompressed) ZIP writer + CRC-32.
//
// A .docx / .xlsx is a ZIP container of XML parts. Rather than add a zip dependency, we emit a
// tiny, standards-compliant ZIP with the STORE method (compression 0). Deterministic — a fixed DOS
// timestamp (1980-01-01) means the same input always yields the same bytes, so the output is golden-
// testable and reproducible. Integrity is verifiable with any unzip tool (`unzip -t` checks CRCs).
//
// Scope: store-only, < 4 GB, ASCII entry names (the OOXML part names are all ASCII). That is all the
// office formats here need; we intentionally do not implement deflate or Zip64.

const encoder = new TextEncoder();

/** Standard CRC-32 (polynomial 0xEDB88320) lookup table, built once. */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 checksum of a byte array (init/xor 0xFFFFFFFF), returned as an unsigned 32-bit number. */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A growable little-endian byte buffer. */
class ByteWriter {
  private parts: Uint8Array[] = [];
  private len = 0;

  get length(): number {
    return this.len;
  }

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.len += bytes.length;
  }

  u16(v: number): void {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v & 0xffff, true);
    this.push(b);
  }

  u32(v: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v >>> 0, true);
    this.push(b);
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.len);
    let offset = 0;
    for (const p of this.parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  }
}

export interface ZipEntry {
  /** Path inside the archive, e.g. "word/document.xml". ASCII. */
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const DOS_DATE_1980_01_01 = 0x0021; // year 0 (1980), month 1, day 1
const DOS_TIME_MIDNIGHT = 0x0000;
const VERSION = 20; // 2.0 — store method, no Zip64

/** Build a ZIP archive (store method) from the given entries, in order. */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const w = new ByteWriter();
  const central: Array<{ nameBytes: Uint8Array; crc: number; size: number; offset: number }> = [];

  for (const e of entries) {
    const nameBytes = encoder.encode(e.name);
    const crc = crc32(e.data);
    const offset = w.length;

    // Local file header
    w.u32(LOCAL_HEADER_SIG);
    w.u16(VERSION); // version needed to extract
    w.u16(0); // general purpose flags
    w.u16(0); // compression method: 0 = store
    w.u16(DOS_TIME_MIDNIGHT);
    w.u16(DOS_DATE_1980_01_01);
    w.u32(crc);
    w.u32(e.data.length); // compressed size (== uncompressed for store)
    w.u32(e.data.length); // uncompressed size
    w.u16(nameBytes.length);
    w.u16(0); // extra field length
    w.push(nameBytes);
    w.push(e.data);

    central.push({ nameBytes, crc, size: e.data.length, offset });
  }

  const centralStart = w.length;
  for (const c of central) {
    w.u32(CENTRAL_HEADER_SIG);
    w.u16(VERSION); // version made by
    w.u16(VERSION); // version needed to extract
    w.u16(0); // flags
    w.u16(0); // method: store
    w.u16(DOS_TIME_MIDNIGHT);
    w.u16(DOS_DATE_1980_01_01);
    w.u32(c.crc);
    w.u32(c.size);
    w.u32(c.size);
    w.u16(c.nameBytes.length);
    w.u16(0); // extra length
    w.u16(0); // comment length
    w.u16(0); // disk number start
    w.u16(0); // internal attributes
    w.u32(0); // external attributes
    w.u32(c.offset);
    w.push(c.nameBytes);
  }
  const centralSize = w.length - centralStart;

  // End of central directory record
  w.u32(EOCD_SIG);
  w.u16(0); // this disk number
  w.u16(0); // disk with central dir
  w.u16(central.length); // entries on this disk
  w.u16(central.length); // total entries
  w.u32(centralSize);
  w.u32(centralStart);
  w.u16(0); // comment length

  return w.toUint8Array();
}
