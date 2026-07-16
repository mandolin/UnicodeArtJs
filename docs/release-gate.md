# Release Gate and Version Graph

The repository-level release gate checks Core, CLI, Web, and the VSCode extension with one repeatable command before a publish or release candidate.

## Command

From the repository root:

```bash
npm run release:gate
```

The command runs package checks, documentation checks, recipe/example checks, static gallery checks, Core and CLI pack dry-runs, isolated VSIX packaging, VSIX content inspection, and final release fact verification.

For npm/Marketplace publish preparation after switching all publish-time dependencies to npm versions:

```bash
npm run release:verify:publish
```

## Current Version Graph

| Package | Current version | Publish channel | Core dependency during normal development |
| --- | --- | --- | --- |
| `unicode-art-js` | `1.2.1` | npm | root workspace package |
| `unicode-art-cli` | `1.0.2` | npm | `file:../core` during development; switch to `^1.2.1` for publish |
| `@unicode-art/web` | `0.1.0-alpha` | GitHub Pages / source package | `file:../core` |
| `unicode-art-js-vscode` | `0.3.0` | VSCode Marketplace stable channel | `^1.2.1` |

## What The Gate Checks

- Root npm workspace shape and package version graph.
- Core `VERSION` constant, package version, and `getCoreCapabilities()` alignment.
- Default Node image backend is `napi-rs`; `sharp` is legacy opt-in only.
- Default Node text rendering is `@napi-rs/canvas` (Skia), not node-canvas/Cairo.
- `package-lock.json`, package manifests, and the VSIX do not include default
  `sharp`, `@img/sharp-*`, libvips, or `node_modules/canvas` dependencies.
- Fixed `@napi-rs/image` / `@napi-rs/canvas` versions and third-party notices
  are present. Real Node text-runtime smoke tests render from both the workspace
  and a freshly installed Core tarball before Core/CLI fixture parity is checked.
- Lockfile package licenses do not include GPL/LGPL/AGPL/MPL/EPL/CDDL markers.
- VSIX includes `unicode-art-js` and `@napi-rs/image`, does not include sharp/libvips, and does not declare a `file:` Core dependency.
- Shared text/image/box fixtures from `fixtures/release/fixtures.json` produce matching Core and CLI output.
- Public docs keep the GitHub Pages URL and release-gate instructions visible.
- `docs:all:check` can regenerate CLI/Web JSDoc, Core/VS Code TSDoc, the terminology contract, and the documentation manifest.
- `recipes:check` can run the public Node examples and representative CLI recipes.
- `gallery:check` can validate the static gallery index, reviewed artwork files, submission templates, licenses, and Core parsing of UAF / semantic-document assets.
- `support:check` can validate the support guide, known limitations page, Issue Forms, and public label catalog.

The audited runtime inventory and redistribution notices are documented in
[`runtime-sbom.md`](runtime-sbom.md).

## Publish Notes

CLI intentionally keeps `unicode-art-js` as `file:../core` during normal development. Before publishing the CLI package, switch it to the npm Core version:

```bash
npm --workspace packages/cli run core:dep:npm
npm run release:verify:publish
```

After publishing, switch it back for day-to-day development:

```bash
npm --workspace packages/cli run core:dep:local
npm install
```

The VSCode extension uses npm Core by default because VSIX packaging is more stable without workspace symlinks. Its package command still stages a local Core tarball internally so an unpublished Core candidate can be verified before release.
