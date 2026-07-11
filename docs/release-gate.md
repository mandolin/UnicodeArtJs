# Release Gate and Version Graph

`W-art-P1.7` adds a repository-level release gate so Core, CLI, Web, and the VSCode extension can be checked with one repeatable command.

## Command

From the repository root:

```bash
npm run release:gate
```

The command runs package checks, Core and CLI pack dry-runs, isolated VSIX packaging, VSIX content inspection, and final release fact verification.

For npm/Marketplace publish preparation after switching all publish-time dependencies to npm versions:

```bash
npm run release:verify:publish
```

## Current Version Graph

| Package | Current version | Publish channel | Core dependency during normal development |
| --- | --- | --- | --- |
| `unicode-art-js` | `1.2.0` | npm | root workspace package |
| `unicode-art-cli` | `1.0.1` | npm | `file:../core` during development; switch to `^1.2.0` for publish |
| `@unicode-art/web` | `0.1.0-alpha` | GitHub Pages / source package | `file:../core` |
| `unicode-art-js-vscode` | `0.2.2` | VSCode Marketplace | `^1.2.0` |

## What The Gate Checks

- Root npm workspace shape and package version graph.
- Core `VERSION` constant, package version, and `getCoreCapabilities()` alignment.
- Default Node image backend is `napi-rs`; `sharp` is legacy opt-in only.
- `package-lock.json` and package manifests do not include default `sharp`, `@img/sharp-*`, or libvips dependencies.
- Lockfile package licenses do not include GPL/LGPL/AGPL/MPL/EPL/CDDL markers.
- VSIX includes `unicode-art-js` and `@napi-rs/image`, does not include sharp/libvips, and does not declare a `file:` Core dependency.
- Shared text/image/box fixtures from `fixtures/release/fixtures.json` produce matching Core and CLI output.
- Public docs keep the GitHub Pages URL and release-gate instructions visible.

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
