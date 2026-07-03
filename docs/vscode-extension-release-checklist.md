# VSCode Extension Release Checklist

## Preflight

- Confirm `packages/vscode-extension/package.json` publisher.
- Confirm extension version.
- Confirm `unicode-art-js` dependency version.
- Confirm Node 22 is active through `mise exec -- node -v`.
- Run `mise exec -- npm run check`.
- Run `mise exec -- npm run package` for the current pre-release version.
- Install the VSIX locally with `code --install-extension`.
- Open the converter from the command palette.
- Convert selected text.
- Convert an image file.
- Test Box title/shadow.
- Save TXT and HTML output.

## Marketplace Publish

Set `VSCE_PAT` or login with `vsce login mandolin`.

For the current pre-release package:

```bash
cd K:\Project\Github_mandolin\UnicodeArtJs\packages\vscode-extension
mise exec -- npm run check
mise exec -- npm run package
vsce publish --pre-release --packagePath .\unicode-art-js-vscode-0.1.0.vsix
```

For a normal release, run `mise exec -- npm run package:release`, then publish without `--pre-release`.

## Post Publish

- Confirm the Marketplace page is reachable.
- Install from Marketplace in a clean VSCode profile.
- Verify the command palette commands.
- Verify editor context menu.
- Verify Explorer image context menu.
- Verify WebView opens and converts text.
- Verify WebView image mode.

## Known Follow-Ups

- Reduce VSIX size by bundling and pruning native dependency files.
- Add automated `@vscode/test-electron` coverage.
- Add screenshots/GIF to README before a broad public release.
- Consider platform-specific VSIX targets if native dependency size becomes a problem.
