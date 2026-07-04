# Changelog

## 0.2.0

VSCode extension pre-release refresh for the T-tea milestone.

### Added

- Editor context menu structure for default template, custom template slots, and Converter entry.
- Default template and Template 1 / 2 / 3 storage.
- Separate visual font and glyph font controls in the Converter.
- Chinese / English localization for commands, menus, settings, Converter labels, status, and errors.
- Advanced reserved glyph-width fields in the Converter.
- Converter image metadata, clear image action, and richer result metadata.
- Output Channel diagnostics for Converter, conversion, template, copy, insert, and save flows.
- Manual and automated release verification checklists.

### Changed

- Improved HTML export styling and glyph font handling.
- Improved save cancellation feedback.
- Improved WebView accessibility labels and status region semantics.
- Expanded unit tests for manifest, templates, protocol, and configuration alignment.

### Known Limitations

- Core-level hard cancellation still requires future `AbortSignal` support in `unicode-art-js`.
- VSIX packaging still includes native image/font dependencies; bundle and package-size optimization remain a follow-up task.

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
