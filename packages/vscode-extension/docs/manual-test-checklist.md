# UnicodeArtJs VSCode Extension Manual Test Checklist

Use this checklist before publishing a new VSIX or Marketplace version.

## Environment

- [ ] Run `npm run check` in `packages/vscode-extension`.
- [ ] Run `npm run package`.
- [ ] Run `npm run inspect:vsix`.
- [ ] Install locally with `code --profile WebDev --install-extension .\unicode-art-js-vscode-0.2.2.vsix --force`.
- [ ] Run `Developer: Reload Window` in the target VSCode profile.
- [ ] Open the `UnicodeArtJs` Output Channel.

## Editor Context Menu

- [ ] Select text in a normal text editor.
- [ ] Confirm the editor context menu shows the UnicodeArtJs group.
- [ ] Run `UnicodeArtJs: Generate Unicode Art: Default Template`.
- [ ] Confirm output is inserted according to `unicodeArtJs.insertMode`.
- [ ] Open `UnicodeArtJs: Generate Unicode Art: Custom Template`.
- [ ] Confirm Template 1 / 2 / 3 are visible.
- [ ] Run an unconfigured template and confirm it prompts to open the Converter.

## Converter Text Flow

- [ ] Run `UnicodeArtJs: Open Converter`.
- [ ] Convert text in Text Banner mode.
- [ ] Confirm output metadata shows source, cols, rows, char count, and preset.
- [ ] Change Visual Font and confirm conversion output changes when the source font changes.
- [ ] Change Glyph Font and confirm preview font changes.
- [ ] Enable Box and test at least `round`, `single`, and `double`.
- [ ] Save as Default Template.
- [ ] Save Template 1.
- [ ] Reopen Converter and confirm template status persists.

## Converter Image Flow

- [ ] Switch to Image mode.
- [ ] Select a supported image file.
- [ ] Confirm file name, mime type, and size are shown.
- [ ] Convert the image.
- [ ] Click Clear Image and confirm image state resets.
- [ ] Try converting without an image and confirm an error code appears in status.

## Output Actions

- [ ] Copy result and confirm clipboard content.
- [ ] Insert result into an active editor.
- [ ] Save TXT.
- [ ] Save HTML and open it in a browser.
- [ ] Cancel a save dialog and confirm the status says save was canceled.

## Localization

- [ ] In a Chinese VSCode UI, confirm commands, menus, settings, Converter labels, status, and errors are Chinese.
- [ ] In an English VSCode UI, confirm the same surfaces are English.

## Diagnostics

- [ ] Confirm Output Channel logs Converter open/close.
- [ ] Confirm text conversion logs request and completion.
- [ ] Confirm image conversion logs file name, mime type, size, request, and completion.
- [ ] Confirm copy / insert / save / template save operations are logged.

## Font Notes

- [ ] With a locally installed legacy CJK system font + round box, confirm the light warning appears when the warning condition is configured manually.
- [ ] With a locally installed non-recommended system mono font, confirm the VSCode font metric warning appears when the warning condition is configured manually.
- [ ] Confirm strict mixed-width monospace fonts such as `等距更纱黑体 SC` or `霞鹜文楷等宽` display more predictably.
