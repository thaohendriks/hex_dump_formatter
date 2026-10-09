import { ok } from 'node:assert';

/**
 * Format an 8-bit unsigned integer as a two-digit lowercase hex string.
 * We zero-pad so that bytes like 0x0f read as "0f", not "f"; canonical
 * hex dumps always use two digits per byte, and anything else breaks
 * the column alignment that is the whole point of the format.
 *
 * @param {number} byte - 0..255 inclusive
 * @returns {string}
 */
function hexByte(byte) {
  ok(Number.isInteger(byte), 'byte must be an integer');
  ok(byte >= 0 && byte <= 255, 'byte must be in range 0..255');
  return byte.toString(16).padStart(2, '0');
}

/**
 * Decide which character represents a byte in the ASCII gutter.
 *
 * Canonical hex dumps replace non-printable bytes with ".". We use the
 * same printable range as `isprint(3)` in C: 0x20 through 0x7e.
 * Anything else (control chars, DEL, high bytes) becomes ".".
 *
 * @param {number} byte - 0..255 inclusive
 * @returns {string} a single character
 */
function asciiChar(byte) {
  if (byte >= 0x20 && byte <= 0x7e) {
    return String.fromCharCode(byte);
  }
  return '.';
}

/**
 * Format binary data as a canonical hex dump: one line per 16 bytes,
 * each line showing an 8-digit hex offset, the bytes as hex (one group of
 * 8, a double space, then a second group of 8), and the ASCII rendering.
 *
 * Lines end with "\n", including the last, so the output is consistently
 * split-able by \n. Callers who want to trim the trailing newline can do so.
 *
 * Bytes are accepted as any iterable that yields integers 0..255. This
 * deliberately covers Uint8Array, Array, and generator functions without
 * a dependency on any particular typed-array constructor.
 *
 * @param {Iterable<number>} bytes
 * @returns {string}
 */
export function formatHexDump(bytes) {
  return formatHexDumpLines(bytes).join('') + '\n';
}

/**
 * Same as formatHexDump, but returns an array of lines without trailing
 * newlines. Useful when the caller wants to prepend a prefix to each line
 * or join with a different separator.
 *
 * @param {Iterable<number>} bytes
 * @returns {string[]} one entry per 16-byte chunk; always includes the final
 *   chunk even if it is shorter than 16 bytes. Returns [] for empty input.
 */
export function formatHexDumpLines(bytes) {
  const all = Array.from(bytes);
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (!Number.isInteger(b) || b < 0 || b > 255) {
      throw new RangeError(
        `byte at index ${i} is ${b}, must be an integer in 0..255`,
      );
    }
  }

  const lines = [];
  for (let offset = 0; offset < all.length; offset += 16) {
    const chunk = all.slice(offset, offset + 16);
    lines.push(formatLine(chunk, offset));
  }
  return lines;
}

/**
 * Render a single dump line. Kept internal because the public API works
 * in terms of whole inputs, not chunks.
 *
 * The offset is shown as 8 lowercase hex digits, which overflows at 4 GiB.
 * That matches `hexdump -C` on Linux and is enough for the use cases this
 * library targets (small blobs, debug output). If you need >4 GiB offsets,
 * this is the single place to widen the field.
 *
 * @param {number[]} chunk - 1..16 bytes
 * @param {number} offset - starting byte offset of this chunk
 * @returns {string}
 */
function formatLine(chunk, offset) {
  const offsetStr = offset.toString(16).padStart(8, '0');

  const left = chunk.slice(0, 8).map(hexByte).join(' ');
  const right = chunk.slice(8, 16).map(hexByte).join(' ');

  // padLeft pads the left group to 23 chars (8 bytes * 2 + 7 spaces = 23)
  // so a short final chunk still lines up with the ASCII gutter.
  const leftPad = left.padEnd(23, ' ');
  const rightPad = right.padEnd(23, ' ');

  const ascii = chunk.map(asciiChar).join('');

  return `${offsetStr}  ${leftPad}  ${rightPad}  |${ascii}|`;
}
