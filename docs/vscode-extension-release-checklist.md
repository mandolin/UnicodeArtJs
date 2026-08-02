# VS Code Extension Release Checklist

## Preflight

- Confirm `packages/vscode-extension/package.json` publisher.
- Confirm extension version.
- Confirm `unicode-art-js` dependency version.
- Confirm Node 22 is active through `mise exec -- node -v`.
- Run `mise exec -- npm run release:gate` from the repository root.
- Review `docs/release-materials.md` for the release note template and post-release checks.
- Run `mise exec -- npm --workspace packages/vscode-extension run test:host` for the development-host activation and command smoke.
- Confirm `mise exec -- npm --workspace packages/vscode-extension run inspect:vsix` passes for the generated VSIX.
- Run `mise exec -- npm --workspace packages/vscode-extension run test:vsix-lifecycle` for an isolated install, same-version replacement, installed-host activation, and uninstall lifecycle.
- If a previous local VSIX is available, add `-- --previous-vsix <path>` and confirm a real lower-to-current version replacement without activating the older payload.
- Install the VSIX in a separate manually controlled VS Code profile and extensions directory; do not use the maintainer's normal profile as release evidence.
- Open the converter from the command palette.
- Convert selected text.
- Convert a supported PNG/JPEG/WebP/BMP image file.
- Open an untrusted workspace and confirm text conversion remains available while Explorer and WebView image conversion are blocked.
- Test Box title/shadow.
- Save TXT and HTML output.
- Send or instrument one invalid WebView payload and confirm the host returns `unknownMessage` without a side effect; automated unit tests cover payload shapes, while a real WebView-to-host round trip remains a manual observation.
- Record the build host OS/architecture, VS Code version, Electron/Node/module ABI, VSIX size and SHA-256. Evidence from one platform or VS Code version must not be generalized to the full support range.

## Artifact and Reproducibility Boundary

The current package closure contains optional native binaries selected during production install. A VSIX assembled on one host must therefore be treated as host-platform-specific unless each target's native closure is built, inspected, installed, activated, and labelled separately. Do not publish a Windows-built artifact as a universal Windows/macOS/Linux result.

The isolated packaging flow produces payload-equivalent files from the same inputs. The outer VSIX ZIP is not currently bit-for-bit reproducible because container entry timestamps vary. Compare the inspected payload manifest and file hashes; do not claim container-byte reproducibility until timestamp normalization is implemented and verified.

## Marketplace Publish

Set `VSCE_PAT` or log in with the repository-pinned `@vscode/vsce` CLI. Publishing is a separate maintainer action after all target artifacts and remote checks are complete.

For a Marketplace pre-release package:

```powershell
# From the repository root:
mise exec -- npm run release:gate
cd packages\vscode-extension
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
mise exec -- node .\node_modules\@vscode\vsce\vsce publish --pre-release --packagePath ".\unicode-art-js-vscode-$version.vsix"
```

For the stable channel, run `mise exec -- npm run package`, then publish without `--pre-release`.

## Post Publish

- Confirm the Marketplace page is reachable.
- Read the Marketplace version through the pinned CLI and compare it with the published VSIX manifest: `mise exec -- node packages/vscode-extension/node_modules/@vscode/vsce/vsce show mandolin.unicode-art-js-vscode --json`.
- Install from Marketplace in a clean VS Code profile.
- Verify the command palette commands.
- Verify editor context menu.
- Verify Explorer image context menu.
- Verify WebView opens and converts text.
- Verify WebView image mode.
- Verify Restricted Mode exposes text conversion but blocks image conversion and sensitive workspace configuration overrides.
- Confirm GIF/SVG/TIFF files are not exposed as default supported image inputs.
- Record Marketplace status, VSIX version, and any post-release follow-up using `docs/release-materials.md`.

## Known Follow-Ups

- Reduce VSIX size by bundling and pruning native dependency files.
- Add screenshots/GIF to README before a broad public release.
- Build and verify explicitly labelled artifacts on every supported platform before claiming cross-platform VSIX coverage.
- Add an installed-extension scan from an ordinary interactive VS Code window; the automated lifecycle host uses an isolated development-path handoff after verifying installed bytes.
- Add real WebView message round-trip coverage and a broader VS Code version matrix.
