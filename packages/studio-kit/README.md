# @unicode-art/studio-kit

Internal experimental shared logic for UnicodeArtJs Studio hosts.

This package is private and intentionally small. The first scope is Virtual Grid projection and hit testing, which are pure CellMap transformations with no DOM, Canvas, filesystem, network, secret, VS Code, Tauri, or Electron dependency.

The package is not a stable public format or runtime API. Host applications still own UI events, storage, renderer adapters, checked apply, provider consent, and workspace writes.
