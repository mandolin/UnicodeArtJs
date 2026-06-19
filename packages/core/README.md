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

## Main APIs

- `textToArt(text, config)` converts text into Unicode art. Requires `canvas` in Node.js.
- `imageToArt(imagePath, config)` converts an image file into Unicode art. Uses `sharp`.
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
