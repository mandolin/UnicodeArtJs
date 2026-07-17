# VSCode Extension Release Checklist

## Preflight

- Confirm `packages/vscode-extension/package.json` publisher.
- Confirm extension version.
- Confirm `unicode-art-js` dependency version.
- Confirm Node 22 is active through `mise exec -- node -v`.
- Run `mise exec -- npm run release:gate` from the repository root.
- Review `docs/release-materials.md` for the release note template and post-release checks.
- Confirm `mise exec -- npm --workspace packages/vscode-extension run inspect:vsix` passes for the generated VSIX.
- Install the VSIX locally with `code --install-extension`.
- Open the converter from the command palette.
- Convert selected text.
- Convert a supported PNG/JPEG/WebP/BMP image file.
- Test Box title/shadow.
- Save TXT and HTML output.

## Marketplace Publish

Set `VSCE_PAT` or login with `vsce login mandolin`.

For a Marketplace pre-release package:

```powershell
# From the repository root:
mise exec -- npm run release:gate
cd packages\vscode-extension
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
vsce publish --pre-release --packagePath ".\unicode-art-js-vscode-$version.vsix"
```

For the stable channel, run `mise exec -- npm run package`, then publish without `--pre-release`.

## Post Publish

- Confirm the Marketplace page is reachable.
- Install from Marketplace in a clean VSCode profile.
- Verify the command palette commands.
- Verify editor context menu.
- Verify Explorer image context menu.
- Verify WebView opens and converts text.
- Verify WebView image mode.
- Confirm GIF/SVG/TIFF files are not exposed as default supported image inputs.
- Record Marketplace status, VSIX version, and any post-release follow-up using `docs/release-materials.md`.

## Known Follow-Ups

- Reduce VSIX size by bundling and pruning native dependency files.
- Add automated `@vscode/test-electron` coverage.
- Add screenshots/GIF to README before a broad public release.
- Consider platform-specific VSIX targets if native dependency size becomes a problem.
