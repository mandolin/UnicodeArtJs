# Browser Adapter Minimal Example

> Status: available via the `unicode-art-js/browser` entry after `browser-adapt-phase-4`.

```ts
import {
  browserPlatformAdapter,
  imageDataToArt,
  OutputFormat,
  PresetCharset
} from 'unicode-art-js/browser';

const file = document.querySelector<HTMLInputElement>('#file')!.files![0];

const imageData = await browserPlatformAdapter.loadImage(file);
const charDataMap = await browserPlatformAdapter.precomputeCharData({
  charset: {
    type: PresetCharset.CUSTOM,
    customChars: ' .:-=+*#%@'
  },
  matrixSize: 6,
  font: 'Noto Sans SC',
  fontSize: 6
});

const result = await imageDataToArt(
  imageData,
  {
    width: 80,
    matrixSize: 6,
    outputFormat: OutputFormat.PLAIN_TEXT,
    charset: {
      type: PresetCharset.CUSTOM,
      customChars: ' .:-=+*#%@'
    }
  },
  {
    charDataMap
  }
);

document.querySelector<HTMLPreElement>('#preview')!.textContent = result.content;
```

## Notes

- The browser adapter targets Chrome 120+.
- URL image loading uses `fetch()` and is subject to CORS.
- Remote font loading uses `FontFace` and `document.fonts.add()`.
- Text and glyph rasterization may differ slightly from Node `canvas` and Python/Pillow.
- The browser entry is intended for modern bundlers such as Vite, Webpack, and Rollup.
