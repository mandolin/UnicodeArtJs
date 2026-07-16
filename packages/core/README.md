# unicode-art-js

MIT-licensed TypeScript core library for converting text or images into Unicode character art.

UnicodeArtJs is an independent TypeScript / JavaScript implementation. Its feature goals reference the public behavior and user experience of UnicodeArt, while the codebase is maintained under the MIT License and avoids copying GPL source code, comments, or line-by-line implementation structure.

## Install

```bash
npm install unicode-art-js
```

Node text rendering is included through the audited
`@napi-rs/canvas` Skia runtime. No extra `canvas` / node-canvas installation is
required.

## Usage

### Node.js

```typescript
import {
  imageToArt,
  textToArt,
  OutputFormat,
  PresetCharset
} from 'unicode-art-js';

const textResult = await textToArt('Hello', {
  height: 12,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT
});

console.log(textResult.content);

const imageResult = await imageToArt('photo.png', {
  width: 80,
  matrixSize: 6,
  invert: false
});

console.log(imageResult.content);
```

### Browser Bundlers

Use the browser entry in Vite/Webpack/Rollup projects:

```typescript
import {
  clearBrowserAdapterCache,
  getBrowserAdapterCacheStats,
  getBrowserRuntimeCapabilities,
  imageToArt,
  OutputFormat,
  PresetCharset
} from 'unicode-art-js/browser';

const file = document.querySelector<HTMLInputElement>('#file')!.files![0];
const controller = new AbortController();
const capabilities = getBrowserRuntimeCapabilities();

const result = await imageToArt(file, {
  width: 80,
  matrixSize: 6,
  font: 'Noto Sans SC',
  outputFormat: OutputFormat.PLAIN_TEXT,
  charset: {
    type: PresetCharset.CUSTOM,
    customChars: ' .:-=+*#%@'
  }
}, {
  signal: controller.signal,
  maxInputPixels: 16_000_000,
  maxOutputCells: 300_000,
  progress: (event) => {
    console.log(event.stage, event.progress);
  }
});

document.querySelector<HTMLPreElement>('#preview')!.textContent = result.content;
console.log(capabilities, getBrowserAdapterCacheStats());
clearBrowserAdapterCache({ glyphs: true, charData: true });
```

The browser entry targets Chrome 120+ and does not import `sharp`, Node canvas
runtime packages, or Node filesystem APIs. URL image loading is subject to
normal browser CORS rules. Browser APIs include glyph/font caches, cache
statistics, runtime capability checks, progress callbacks, cancellation, and
large-image limits.

The browser entry is usable today, but cross-browser pixel-level parity is still treated as experimental. If exact output matching matters, pin the browser/runtime/font combination in your own tests.

## Main APIs

- `textToArt(text, config)` converts text into Unicode art. Node uses the
  bundled `@napi-rs/canvas` Skia runtime by default.
- `imageToArt(imagePath, config)` converts an image file into Unicode art. The default Node backend uses `@napi-rs/image`.
- `semanticDocumentToArt(document, config)` renders an experimental versioned semantic document with tables, headers/footers, spans, raw-text blocks, and embedded UAF art-font blocks.
- `renderUnicodeArtFontText(font, text)` expands an experimental UAF font into deterministic multi-line glyph art for custom composition.
- `unicode-art-js/browser` exports browser `imageToArt()`, browser `textToArt()`, `browserPlatformAdapter`, `loadBrowserFont`, cache controls, runtime capability checks, and pure conversion APIs for browser projects.
- `unicode-art-js/pure` exports platform-independent sampling, matching, assembly, box, and `imageDataToArt()` APIs.
- `validateConfig(config)` validates and fills defaults.
- `getCoreCapabilities()` returns the current stable / experimental / reserved Core capability boundary for host UIs and documentation.
- `isWideChar(char)` detects East Asian wide characters.
- `getPresetChars(type)` returns preset character sets.
- `t(key, params, locale)` renders built-in Core messages for `zh-CN` / `en-US`.
- `normalizeLocale(locale)` normalizes host locale values before passing them into Core config.
- `getNodeImageBackend()`, `setNodeImageBackend()`, and `resetNodeImageBackend()` expose the Node image backend boundary. The default backend is `napi-rs`; `sharp` is a legacy opt-in adapter for users who install `sharp` themselves.

## Stability Notes

- Stable: Node `textToArt()`, Node `imageToArt()`, pure `imageDataToArt()`, config validation, preset charsets, output assembly, and post/outer `box` rendering.
- Experimental: browser high-level conversion, browser cache lifecycle, browser cancellation, layout-stage `box` modes such as `lines` / `grid`, semantic documents, glyph-width profiles, and Unicode art font documents.
- Reserved: `charSpace`, `maxParallelTasks`, and `visualFont.reduceTop/right/bottom/left`. These fields are normalized for future multi-host configuration, but they do not all change current Core output yet.

Hosts can read the same boundary from `getCoreCapabilities()` instead of duplicating stability lists in UI code.
For desktop, browser and custom decoder boundaries, see the repository-level
[host integration guide](../../docs/host-integration.md).

Node runtime note: Core no longer installs `sharp` or node-canvas by default.
The default image backend targets PNG / JPEG / WebP / BMP; the default text
backend is `@napi-rs/canvas` (Skia). GIF first-frame support and SVG / TIFF
paths remain outside the stable default image contract for now. If you
explicitly need the old sharp path, install `sharp` in your application and call
`setNodeImageBackend('sharp')`.

Changing a text rasterizer can change anti-aliasing and font metrics. If output
must be reproducible, pin the Core version, Node runtime, selected visual font,
and glyph font in your own regression tests. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and the repository
[runtime component inventory](https://github.com/mandolin/UnicodeArtJs/blob/main/docs/runtime-sbom.md)
for the native runtime boundary.

## Configuration

Important options:

- `height` / `width`: output size. At least one is required.
- `matrixSize`: sample matrix size, default `6`.
- `ratio`: vertical/horizontal ratio, default `2.0`.
- `charset`: `PresetCharset.ASCII`, `EXTENDED`, `CHINESE_SIMPLE`, or `CUSTOM`.
- `visualFont`: input text rendering font, replacing the old `font` / `fontStyle` / `fontReduce` naming in new integrations.
- `glyphFont`: output glyph display font contract. `family` is descriptive for hosts; experimental `widthProfile` and `wideCharRegex` control the shared glyph-cell width calculation used by boxes, semantic layouts, exports, and `ArtResult.cols`.
- `outputFormat`: `OutputFormat.PLAIN_TEXT`, `HTML`, or `ANSI`.
- `outputTarget`: host target such as `plain`, `terminal`, `web`, `vscode`, `electron`, `html`, or `ansi`. It is metadata for host coordination and does not change sampling today.
- `invert`: invert grayscale values before matching.
- `wideCharRatio`: controls when wide characters win over normal characters.
- `locale`: Core message locale, currently `zh-CN` or `en-US`. This affects errors and hints only; conversion output is unchanged.

`font`, `fontStyle`, `fontReduce`, `glyphFontFamily`, `glyphWidthProfile`, and `wideCharRegex` remain supported as compatibility aliases. New host integrations should prefer the grouped shape:

```typescript
await textToArt('UnicodeArtJs', {
  height: 20,
  visualFont: {
    family: 'Noto Sans SC',
    reduce: 0
  },
  glyphFont: {
    family: 'Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, Liberation Mono, monospace',
    widthProfile: 'default',
    wideCharRegex: undefined
  },
  outputTarget: 'web',
  locale: 'zh-CN'
});
```

`wideCharRegex` is deliberately restricted to one Unicode character class, such as
`[\\u4e00-\\u9fff]`. When supplied, it is the complete set of two-cell glyphs and takes
precedence over `widthProfile`; this makes the rule deterministic across Node, browser,
CLI, and editor hosts. Built-in `sarasa-mono-sc` and `lxgw-wenkai-mono` profiles are
experimental and treat Box Drawing characters as one cell. Use an explicit custom rule
when a display font differs from those assumptions.

## Experimental Semantic Documents

Semantic documents are a versioned JSON AST for layouts that need headers, footers,
row/column spans, and source text that must remain literal. JSON is the canonical format;
the lightweight DSL parser is an optional import convenience and can evolve independently.

```ts
import { semanticDocumentToArt } from 'unicode-art-js';

const result = await semanticDocumentToArt({
  version: 1,
  rows: [
    {
      role: 'header',
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'Name' }] },
        { blocks: [{ kind: 'raw-text', text: 'Value' }] }
      ]
    },
    {
      cells: [
        { blocks: [{ kind: 'art-text', text: 'UnicodeArtJs' }] },
        { blocks: [{ kind: 'raw-text', text: 'kept exactly as typed' }] }
      ]
    }
  ]
}, {
  height: 12,
  box: { style: 'ascii', renderStage: 'layout', mode: 'grid' }
});
```

Use `rowSpan` and `colSpan` in JSON. The DSL accepts `{rowspan:n}` and `{colspan:n}`;
legacy `{c:n}` / `{r:n}` aliases remain parser-only compatibility input. `{t:...}` creates
a `raw-text` block. Call `parseSemanticDocumentJson()`, `parseSemanticDsl()`, or
`validateSemanticDocument()` before storing a document when an application needs explicit
validation feedback.

## Experimental Unicode Art Fonts

Unicode art fonts are versioned UTF-8 `.uafont.json` documents for handcrafted multi-line
glyphs. They are separate from `visualFont` and `glyphFont`: the former controls input-text
rasterization, the latter controls the display of generated glyph cells, while an art font is
content that later layout/rendering APIs can compose.

Core provides parsing, structural validation, provenance checks, glyph fallback, deterministic
cell measurement, and multi-line glyph rendering. An embedded UAF object can be used as an
`art-font-text` block in a semantic JSON document, where it shares the document's glyph-width
calculator with tables and boxes. Core does not bundle third-party FIGlet assets, download font
files, or claim a legal conclusion about a third-party asset. The format and APIs remain
experimental.

```ts
import {
  measureUnicodeArtFontText,
  parseUnicodeArtFontJson,
  renderUnicodeArtFontText
} from 'unicode-art-js';

const font = parseUnicodeArtFontJson(JSON.stringify({
  format: 'unicode-art-font',
  version: 1,
  meta: {
    id: 'org.example.line-banner',
    name: 'Line Banner',
    authors: ['Example Author'],
    license: { expression: 'MIT', origin: 'original' }
  },
  metrics: { height: 1, defaultAdvance: 2, fallbackGlyph: '?' },
  glyphs: {
    A: { lines: ['AA'] },
    '?': { lines: ['??'] }
  }
}));

console.log(measureUnicodeArtFontText(font, 'A?'));
console.log(renderUnicodeArtFontText(font, 'A?').content);
```

Every glyph line must have exactly `metrics.height` rows across the glyph and must not store trailing
whitespace. `advance` is measured with the same `GlyphWidthCalculator` used by boxes and semantic
layouts. Imported or derived fonts must provide both `sourceUrl` and `attribution`; use
`isPermissiveUnicodeArtFontLicense()` only as the project's official-bundle policy check, not as
legal advice. UAF v1 currently renders LTR fonts only: a font declaring `metrics.direction: "rtl"`
returns a structured `ART_FONT_RENDER_FAILED` error until a real bidirectional composition rule is
defined.

## Experimental Declarative Extensions

UAEM v1 describes a local extension package that contributes only versioned semantic documents
and UAF art fonts. The Core parser validates a strict manifest, safe relative resource paths,
license and provenance metadata, Core version bounds, host targets, and declared capabilities. It
does not read files, load sibling assets, install packages, execute JavaScript or WASM, or make
network requests.

Hosts are responsible for actual file-system trust boundaries. For example, the CLI resolves every
resource real path inside the selected manifest directory before parsing it; the browser currently
inspects only an explicitly selected manifest because it cannot automatically read sibling files.
See the public [UAEM reference](../../docs/extension-manifest.md) and the official
[Line Banner example](../extension-line-banner/).

## Core i18n

Core errors include machine-readable `code`, optional `messageKey`, optional `messageParams`, and optional `locale`. Hosts such as CLI, Web, VSCode, and Electron can pass `locale` in `ArtConfig` and reuse exported message helpers:

```typescript
import { t, normalizeLocale } from 'unicode-art-js';

const locale = normalizeLocale('en-US');
console.log(t('config.height.positive', {}, locale));
```

## Support

For issue routing, supported surfaces, and safe bug-report details, see the repository
[support guide](../../docs/support.md). Current font, browser, image-format, and experimental
feature boundaries are listed in [known limitations](../../docs/known-limitations.md).

## License

MIT
