# Changelog

## 0.1.0

Initial VSCode extension release candidate.

### Added

- Text selection to Unicode art conversion.
- Image file to Unicode art conversion.
- Converter WebView with text and image modes.
- Core `unicode-art-js` integration for `textToArt` and `imageToArt`.
- Box options for style, padding, margin, title, and shadow.
- Result insertion modes:
  - replace selection
  - before selection
  - after selection
  - previous line
  - next line
  - new document
  - clipboard only
- Save generated output as TXT or HTML.
- Recent configuration memory and basic preset saving.
- Status bar entry.
- WebView progress, cancellation UI, validation, and result metadata.
- Unit tests and package validation workflow.

### Known Limitations

- WebView cancellation currently stops result updates but does not hard-abort core computation.
- Image conversion is currently focused on local files.
- Multi-preset management and PNG export are planned for later phases.
