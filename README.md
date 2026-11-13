# hex-dump-formatter

Formats binary data into a canonical hex dump: 8-digit hex offset, two groups of eight space-separated lowercase hex bytes, and an ASCII gutter where non-printable bytes show as `.`.

```js
import { formatHexDump, formatHexDumpLines } from 'hex-dump-formatter';

const out = formatHexDump(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x80]));
console.log(out);
// 00000000  48 65 6c 6c 6f 00 80                              |Hello..|

// formatHexDumpLines returns an array of lines without trailing newlines,
// for callers who want to prefix each line or join differently.
const lines = formatHexDumpLines(new Uint8Array([0x01, 0x02]));
```

## Why

Debugging binary protocols and file formats benefits from a quick, dependency-free way to turn raw bytes into the same hex dump you'd get from `hexdump -C`. This library does exactly that and nothing else. The trade-off: it accepts any `Iterable<number>` (so `Uint8Array`, plain arrays, generators all work) and validates each byte is an integer in 0..255, which means it eagerly buffers the whole input rather than streaming. That's fine for debug-scale data and keeps the API trivial.

## Edge cases

- **Empty input** returns an empty string (or empty array for the lines variant) — no headers, no padding.
- **Short final chunk**: the last line is padded with spaces so the ASCII gutter stays aligned with the lines above it.
- **Offsets overflow at 4 GiB**: the offset field is 8 hex digits. If you need dumps of inputs larger than that, widen the field in `formatLine` — it's the single place the width is set.
- **Byte validation**: every value must be an integer in 0..255. A `Uint8Array` satisfies this by construction; a hand-built `Array` of `Number`s will throw `RangeError` on anything outside the range, including non-integers.

The input contract is the awkward edge. If you pass a JS `Array` built from `charCodeAt` on a string containing characters above U+00FF, you'll get a `RangeError` per-byte rather than silently truncating. That is intentional.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Contributing

Issues and pull requests are welcome. Please keep the dependency list empty —
that constraint is the point of the project, not an oversight.

