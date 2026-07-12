# Node Runtime Component Inventory

This document records the native runtime components redistributed by the Node
Core package and the VSCode extension. It is intentionally version-specific:
upgrading a native package or adding a platform requires a fresh review.

It is an engineering inventory rather than legal advice.

## Supported Default Runtime

| Component | Fixed version | Role | License boundary |
| --- | --- | --- | --- |
| `@napi-rs/image` | `1.14.0` | Node image decode and resize for PNG, JPEG, WebP, BMP | npm package MIT; audited codec/binding path uses permissive licenses |
| `@napi-rs/canvas` | `1.0.2` | Node text rasterization through `@napi-rs/canvas/node-canvas` | npm package MIT; Skia-based platform binary |
| Skia | upstream component of the Canvas binary | 2D rasterization | BSD-3-Clause |
| FreeType | upstream component of the Canvas binary | glyph rasterization | FreeType License (FTL) |
| HarfBuzz | upstream component of the Canvas binary | text shaping | MIT-style |
| ICU data | `icudtl.dat` in the Canvas platform package | Unicode/text data | Unicode-3.0 |

The project locks the two direct native npm packages to exact versions. The
root `package-lock.json` supplies the resolved platform packages and integrity
hashes. Core's `THIRD_PARTY_NOTICES.md` is included in the Core npm tarball;
the VSIX includes notices both at its root and inside the staged Core package.

## Explicitly Excluded From The Default Path

- `sharp`, `@img/sharp-*`, and `sharp-libvips`.
- `canvas` / node-canvas and its Cairo/Pango backend chain.
- User-installed fonts and operating-system text services. UnicodeArtJs neither
  packages nor redistributes them.

`sharp` remains a legacy opt-in image adapter only. An application that enables
it takes responsibility for installing and auditing it; it is not part of the
Core npm package's default runtime, CLI's normal install, or the VSIX.

## Audit Evidence And Limits

- `@napi-rs/canvas@1.0.2` registry metadata identifies commit
  `826600b258db693d98a652c935e2b94107b41bb2`, declares MIT, and exposes the
  Node Canvas compatibility entry used by Core.
- `@napi-rs/image@1.14.0` identifies commit
  `9e93ec3ee7158163f874579471882bec07cf4572`, declares MIT, and is limited by
  Core to the stable input formats above.
- The Windows x64 Canvas platform package contains a Skia native module and
  `icudtl.dat`; it does not ship separate Cairo/Pango/libvips files. The
  release gate scans package manifests, lockfiles, and VSIX entries to reject
  the excluded default-path packages.
- Native upstream projects do not expose a single, immutable per-binary SBOM
  for every target. This inventory therefore records the fixed npm artifacts,
  their upstream source/notice boundary, and the components actually relied on
  by the supported Core path. A platform/version change is not covered by this
  conclusion until it is re-audited.

## Release Requirements

Run the repository release gate before publishing:

```bash
npm run release:gate
```

It verifies the native package versions, rejects legacy default dependencies,
executes real Node text-rendering smoke tests in both the workspace and a
fresh Core tarball installation, packages and inspects the VSIX, and checks the
Core/CLI shared fixtures. The detailed commands are in
[`release-gate.md`](release-gate.md).
