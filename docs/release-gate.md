# Release Gate and Version Graph

The repository-level release gate checks Core, CLI, Web, and the VSCode extension with one repeatable command before a publish or release candidate.

## Command

From the repository root:

```bash
npm run release:gate
```

The command runs package checks, documentation checks, recipe/example checks, static gallery checks, release-material checks, Core and CLI pack dry-runs, isolated VSIX packaging, VSIX content inspection, and final release fact verification.

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
- `public-entry:check` can validate public README links, package metadata, package README support links, and repository entrypoints.
- `stability:check` can validate the experimental stability matrix against `getCoreCapabilities()`.
- `config-model:check` can validate the shared configuration model across Core, CLI, Web, and the VSCode extension.
- `glyph-width:check` can validate glyph-width layout documentation, the shared calculator helper, critical call sites, and regression test coverage.
- `semantic-uaf-beta:check` can validate the UAF / semantic-document beta contract, canonical fixtures, Core rendering, CLI consumption, and Web fixture coverage.
- `uaf-authoring:check` can validate the UAF author guide, official line font, beta fixture, Core rendering, CLI font validation, and author-facing entry links.
- `semantic-document-authoring:check` can validate the semantic document author guide, author fixtures, DSL import, Core rendering, and CLI document rendering.
- `extension-sdk:check` can validate the declarative extension SDK, the official Line Banner package, Core manifest parsing, CLI side-load preflight, and Web manifest-only inspection coverage.
- `creative-ecosystem:check` can validate the UAF, semantic layout, UAEM, official extension package, static gallery, and author-facing documentation links as one creative-asset baseline.
- `desktop-host:check` can validate the desktop host baseline, canonical `*.uaproj` v1 fixtures, Compatible documentation links, and release-gate integration.
- `optional-adapters:check` can validate 可选输入格式 (optional input format) and adapter policy, Core default image formats, VS Code image entrypoints, Compatible documentation links, and release-gate integration.
- `performance-release:check` can validate the public performance baseline, `benchmark:core` command wiring, CI step, release surfaces, and version decision rules.
- `release-materials:check` can validate [`docs/release-materials.md`](release-materials.md), release note templates, npm / Marketplace / GitHub Pages post-release checks, and package-level tag reminders.

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

Release notes, package-level tag naming, and post-release verification steps are standardized in
[`docs/release-materials.md`](release-materials.md). Its static guard is `release-materials:check`.
