import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { formatHexDump, formatHexDumpLines } from '../src/index.js';

function toBytes(str) {
  return Array.from(str, (c) => c.charCodeAt(0));
}

function padToWidth(s, width) {
  return s + ' '.repeat(Math.max(0, width - s.length));
}

function expectedLine(offsetHex, bytes, ascii) {
  const left = bytes.slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join(' ');
  const right = bytes.slice(8, 16).map((b) => b.toString(16).padStart(2, '0')).join(' ');
  return `${offsetHex}  ${padToWidth(left, 23)}  ${padToWidth(right, 23)}  |${ascii}|`;
}

test('empty input produces empty string from formatHexDump', () => {
  assert.equal(formatHexDump([]), '\n');
  assert.deepEqual(formatHexDumpLines([]), []);
});

test('single byte line', () => {
  const out = formatHexDumpLines([0x41]);
  assert.deepEqual(out, [expectedLine('00000000', [0x41], 'A')]);
});

test('exactly 16 bytes fills one line with empty right group', () => {
  const bytes = toBytes('0123456789abcdef');
  const out = formatHexDumpLines(bytes);
  assert.deepEqual(out, [
    '00000000  30 31 32 33 34 35 36 37  38 39 61 62 63 64 65 66  |0123456789abcdef|',
  ]);
});

test('17 bytes produces two lines, second padded', () => {
  const bytes = toBytes('0123456789abcdefX');
  const out = formatHexDumpLines(bytes);
  assert.deepEqual(out, [
    '00000000  30 31 32 33 34 35 36 37  38 39 61 62 63 64 65 66  |0123456789abcdef|',
    expectedLine('00000010', [0x58], 'X'),
  ]);
});

test('offset increments by 16 per line', () => {
  const bytes = new Array(33).fill(0x41); // 2 full + 1 byte
  const out = formatHexDumpLines(bytes);
  assert.equal(out.length, 3);
  assert.ok(out[0].startsWith('00000000  '));
  assert.ok(out[1].startsWith('00000010  '));
  assert.ok(out[2].startsWith('00000020  '));
});

test('non-printable bytes render as dot in ASCII gutter', () => {
  const out = formatHexDumpLines([0x00, 0x1f, 0x20, 0x7e, 0x7f, 0xff]);
  const line = out[0];
  assert.ok(line.endsWith('|.. ~..|'));
});

test('bytes are lowercase hex', () => {
  const out = formatHexDumpLines([0x0a, 0xff]);
  assert.ok(out[0].includes('0a'));
  assert.ok(out[0].includes('ff'));
  assert.ok(!out[0].includes('0A'));
  assert.ok(!out[0].includes('FF'));
});

test('Uint8Array input works', () => {
  const u = new Uint8Array([0x01, 0x02, 0x03]);
  const out = formatHexDump(u);
  assert.equal(out, expectedLine('00000000', [0x01, 0x02, 0x03], '...') + '\n');
});

test('formatHexDump ends with trailing newline', () => {
  const out = formatHexDump([0x41]);
  assert.ok(out.endsWith('\n'));
});

test('rejects non-integer byte', () => {
  assert.throws(() => formatHexDump([0x41, 1.5]), RangeError);
});

test('rejects negative byte', () => {
  assert.throws(() => formatHexDump([-1]), RangeError);
});

test('rejects byte > 255', () => {
  assert.throws(() => formatHexDump([256]), RangeError);
});

test('generator input works', () => {
  function* gen() { yield 0x41; yield 0x42; }
  const out = formatHexDumpLines(gen());
  assert.deepEqual(out, [expectedLine('00000000', [0x41, 0x42], 'AB')]);
});
