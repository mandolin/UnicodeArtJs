# unicode-art-js

MIT-licensed TypeScript core library for converting text or images into Unicode character art.

UnicodeArtJs is an independent TypeScript / JavaScript implementation. Its feature goals reference the public behavior and user experience of UnicodeArt, while the codebase is maintained under the MIT License and avoids copying GPL source code, comments, or line-by-line implementation structure.

## Install

```bash
npm install unicode-art-js
```

For text rendering in Node.js, install the optional `canvas` peer dependency:

```bash
npm install canvas
```

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

The browser entry targets Chrome 120+ and does not import `sharp`, `canvas`, or Node filesystem APIs. URL image loading is subject to normal browser CORS rules. Browser APIs include glyph/font caches, cache statistics, runtime capability checks, progress callbacks, cancellation, and large-image limits.

## Main APIs

- `textToArt(text, config)` converts text into Unicode art. Requires `canvas` in Node.js.
- `imageToArt(imagePath, config)` converts an image file into Unicode art. Uses `sharp`.
- `unicode-art-js/browser` exports browser `imageToArt()`, browser `textToArt()`, `browserPlatformAdapter`, `loadBrowserFont`, cache controls, runtime capability checks, and pure conversion APIs for browser projects.
- `unicode-art-js/pure` exports platform-independent sampling, matching, assembly, box, and `imageDataToArt()` APIs.
- `validateConfig(config)` validates and fills defaults.
- `isWideChar(char)` detects East Asian wide characters.
- `getPresetChars(type)` returns preset character sets.
- `t(key, params, locale)` renders built-in Core messages for `zh-CN` / `en-US`.
- `normalizeLocale(locale)` normalizes host locale values before passing them into Core config.

## Configuration

Important options:

- `height` / `width`: output size. At least one is required.
- `matrixSize`: sample matrix size, default `6`.
- `ratio`: vertical/horizontal ratio, default `2.0`.
- `charset`: `PresetCharset.ASCII`, `EXTENDED`, `CHINESE_SIMPLE`, or `CUSTOM`.
- `visualFont`: input text rendering font, replacing the old `font` / `fontStyle` / `fontReduce` naming in new integrations.
- `glyphFont`: output glyph display font contract, including `family`, `widthProfile`, and `wideCharRegex`.
- `outputFormat`: `OutputFormat.PLAIN_TEXT`, `HTML`, or `ANSI`.
- `outputTarget`: host target such as `plain`, `terminal`, `web`, `vscode`, `electron`, `html`, or `ansi`.
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

## Core i18n

Core errors include machine-readable `code`, optional `messageKey`, optional `messageParams`, and optional `locale`. Hosts such as CLI, Web, VSCode, and Electron can pass `locale` in `ArtConfig` and reuse exported message helpers:

```typescript
import { t, normalizeLocale } from 'unicode-art-js';

const locale = normalizeLocale('en-US');
console.log(t('config.height.positive', {}, locale));
```

## License

MIT
