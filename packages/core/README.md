# unicode-art-js

TypeScript core library for converting text or images into Unicode character art.

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
  font: 'Consolas',
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

## Configuration

Important options:

- `height` / `width`: output size. At least one is required.
- `matrixSize`: sample matrix size, default `6`.
- `ratio`: vertical/horizontal ratio, default `2.0`.
- `charset`: `PresetCharset.ASCII`, `EXTENDED`, `CHINESE_SIMPLE`, or `CUSTOM`.
- `outputFormat`: `OutputFormat.PLAIN_TEXT`, `HTML`, or `ANSI`.
- `invert`: invert grayscale values before matching.
- `wideCharRatio`: controls when wide characters win over normal characters.

## License

MIT
