# UnicodeArtJs

Convert selected text or image files to Unicode character art inside VSCode.

This extension is built on the MIT-licensed `unicode-art-js` core package. UnicodeArtJs is an independent TypeScript / JavaScript implementation whose feature goals reference the public behavior and user experience of UnicodeArt without copying GPL source code or line-by-line implementation structure.

## Features

- Convert selected editor text to Unicode art.
- Convert local image files from the command palette or Explorer context menu.
- Open a built-in converter WebView with text and image modes.
- Configure height, width, charset, visual font, matrix size, ratio, invert, trim, and font reduce.
- Keep visual font, glyph font, locale, and output target aligned with the Core unified configuration model.
- Enable Box rendering with style, padding, margin, title, and shadow.
- Insert output into the active editor, open a new document, or copy to clipboard.
- Save generated output as `.txt` or `.html`.
- Remember the most recent configuration.
- Save a default template and three custom template slots for editor context menu generation.
- Open the converter from the VSCode status bar.
- Pass VSCode language into Core locale for localized Core errors.
- Choose a separate glyph font in the Converter preview and HTML export.

## Commands

Use the Command Palette:

- `UnicodeArtJs: Open Converter`
- `UnicodeArtJs: Generate Unicode Art`
- `UnicodeArtJs: Generate Unicode Art With Options`
- `UnicodeArtJs: Convert Image File`
- `UnicodeArtJs: Open Settings`
- `UnicodeArtJs: Save Current Preset`

Context menus:

- Select text in an editor, then right-click to use:
  - `UnicodeArtJs: Generate Unicode Art: Default Template`
  - `UnicodeArtJs: Generate Unicode Art: Custom Template > Template 1 / 2 / 3`
  - `UnicodeArtJs: Open Converter`
- Right-click a `png`, `jpg`, `jpeg`, `webp`, `gif`, or `bmp` file in Explorer to convert it.

## Quick Start

1. Select text in an editor.
2. Right-click and choose `UnicodeArtJs: Generate Unicode Art: Default Template`.
3. Use `UnicodeArtJs: Open Converter` for full controls, image conversion, previews, exports, and template saving.
4. Adjust `Visual Font` for how source text is rendered before conversion.
5. Adjust `Glyph Font` for how generated art is previewed, exported to HTML, and displayed in VSCode.

After installing or reinstalling a local VSIX, run `Developer: Reload Window` if commands or menus do not appear immediately.

## Settings

The extension uses the `unicodeArtJs` setting namespace.

Common settings:

- `unicodeArtJs.height`
- `unicodeArtJs.width`
- `unicodeArtJs.charset`
- `unicodeArtJs.customChars`
- `unicodeArtJs.font` legacy visual font alias
- `unicodeArtJs.visualFont`
- `unicodeArtJs.glyphFont`
- `unicodeArtJs.glyphWidthProfile`
- `unicodeArtJs.wideCharRegex`
- `unicodeArtJs.matrixSize`
- `unicodeArtJs.ratio`
- `unicodeArtJs.invert`
- `unicodeArtJs.fontReduce`
- `unicodeArtJs.trimTrailingSpaces`
- `unicodeArtJs.insertMode`

Visual font notes:

- `Visual Font` controls how input text is rasterized before conversion.
- Built-in defaults and suggestions prefer open fonts such as `Noto Sans SC`, `Sarasa Mono SC`, `LXGW WenKai Mono`, `Source Code Pro`, and `Liberation Mono`.
- Localized Chinese system-font names such as `黑体`, `宋体`, `新宋体`, and `微软雅黑` are still normalized for old user presets, but they are compatibility inputs only. UnicodeArtJs does not redistribute these fonts.
- `Glyph Font` only controls how the generated art is displayed in preview/export. It does not change the source text rasterization.
- For best display, prefer a strict mixed-width monospace font, for example `Sarasa Mono SC` / `等距更纱黑体 SC` or `LXGW WenKai Mono` / `霞鹜文楷等宽`.
- In VSCode, some locally installed system fonts may show unexpected spacing because of editor font metrics or fallback behavior. Try changing `editor.fontFamily`, trying another glyph font, or toggling `editor.disableMonospaceOptimizations`.

Box settings:

- `unicodeArtJs.box.enabled`
- `unicodeArtJs.box.style`
- `unicodeArtJs.box.padding`
- `unicodeArtJs.box.margin`
- `unicodeArtJs.box.title`
- `unicodeArtJs.box.shadow`

## Converter WebView

Run `UnicodeArtJs: Open Converter` to open the interactive panel.

The panel supports:

- Text Banner mode.
- Image mode.
- Separate visual font and glyph font options.
- Preview, copy, insert, save TXT, save HTML.
- Save current options as the default template or Template 1 / 2 / 3.
- Basic progress and cancellation UI.
- Advanced fields for reserved glyph width rules: `glyphWidthProfile`, `wideCharRegex`, `outputTarget`, and `locale`.
- Image details, clear image action, and Output Channel diagnostics.

Cancellation currently prevents canceled requests from updating the preview. Core-level hard cancellation will require future `AbortSignal` support in `unicode-art-js`.

## Templates

The extension supports one default template and three custom template slots.

- `Save Default Template` stores the current Converter options for the default editor context-menu command.
- `Save Template` stores the current Converter options into Template 1 / 2 / 3.
- `UnicodeArtJs: Save Current Preset` can also save the current resolved settings into the default template or a template slot.
- If a custom template slot has not been configured yet, the command prompts you to open the Converter.

Templates store conversion options such as size, charset, visual font, glyph font, box options, insert mode, locale, and reserved glyph-width fields.

## Development

```bash
npm install
npm run check
npm run package
npm run inspect:vsix
```

`npm run check` runs:

- TypeScript compilation.
- Node unit tests.
- WebView JavaScript syntax check.

`npm run package` builds the extension through an isolated staging directory, so the VSIX uses packaged Core files instead of monorepo workspace links.

Manual verification before publishing is tracked in [`docs/manual-test-checklist.md`](docs/manual-test-checklist.md).

## Notes

- The WebView uses local bundled assets only. It does not load CDN scripts.
- Image conversion currently supports local files.
- For best output display, use a strict mixed-width monospace font when viewing generated art.

## Local Install

After packaging, install the VSIX locally:

```bash
code --install-extension .\unicode-art-js-vscode-0.2.2.vsix --force
```

For profile-specific testing:

```bash
code --profile WebDev --install-extension .\unicode-art-js-vscode-0.2.2.vsix --force
```

Then run `Developer: Reload Window` in that VSCode window.

## Marketplace Publish

Publishing requires a valid VSCode Marketplace publisher and PAT configured for `vsce`.

```bash
npm run check
npm run package
npm run inspect:vsix
vsce publish --pre-release --packagePath .\unicode-art-js-vscode-0.2.2.vsix
```
