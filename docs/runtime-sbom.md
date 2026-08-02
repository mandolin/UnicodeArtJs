# Node Runtime Component Inventory

This document records the native runtime components redistributed by the Node
Core package and the VS Code extension. It is intentionally version-specific:
upgrading a native package or adding a platform requires a fresh review.

It is an engineering inventory rather than legal advice.

## Supported Default Runtime

| Component | Fixed version | Role | License boundary |
| --- | --- | --- | --- |
| `@napi-rs/image` | `1.14.0` | Node image decode and resize for PNG, JPEG, WebP, BMP | npm package MIT; 13-target source-resolution map contains 172 normal/build components with declared permissive license choices |
| `@napi-rs/canvas` | `1.0.2` | Node text rasterization through `@napi-rs/canvas/node-canvas` | npm package MIT; Skia-based platform binary |
| Skia | upstream component of the Canvas binary | 2D rasterization | BSD-3-Clause |
| FreeType | upstream component of the Canvas binary | glyph rasterization | FreeType License (FTL) |
| HarfBuzz | upstream component of the Canvas binary | text shaping | MIT-style |
| ICU data | `icudtl.dat` in the Canvas platform package | Unicode/text data | Unicode-3.0 |

The project locks the two direct native npm packages to exact versions. The
root `package-lock.json` supplies the resolved platform packages and integrity
hashes. Core's `THIRD_PARTY_NOTICES.md` is included in the Core npm tarball;
the VSIX includes notices both at its root and inside the staged Core package.
The default image-format boundary and future adapter routes are tracked in
[`optional-input-adapters.md`](optional-input-adapters.md).

## `@napi-rs/image` Native Component Map

Core also ships [`NATIVE_COMPONENTS.json`](../packages/core/NATIVE_COMPONENTS.json).
It maps 172 normal/build components to versions, SPDX license expressions, and
the 13 native/WASI targets declared by `@napi-rs/image@1.14.0`. The map is based
on upstream commit `9e93ec3ee7158163f874579471882bec07cf4572` and a Cargo 1.97.1
resolution performed on 2026-08-02. Development-only dependencies are excluded.

The upstream commit does not contain a `Cargo.lock`. The generated audit lock has
SHA-256 `2eee2fcfc3f932fb76873545651457ba17213c44942ba1cf520cb97cbbcbf881`,
so the map is a fixed source-resolution audit snapshot, not a claim that the
published native binaries are bit-exactly reproducible from that lock.

The redistribution-facing codec and binding anchors are:

| Component | Resolved version | Declared license | Role / boundary |
| --- | --- | --- | --- |
| `napi_rs_image` | `0.0.0` at the fixed upstream commit | MIT repository license | Native addon workspace crate |
| `napi` / `napi-derive` / `napi-build` | `3.12.0` / `3.6.2` / `2.4.0` | MIT | Node-API binding and build support |
| `image` / `fast_image_resize` | `0.25.10` / `6.1.0` | MIT OR Apache-2.0 | Decode, pixel conversion, and resize |
| `jpeg-decoder` / `zune-jpeg` | `0.3.2` / `0.5.15` | MIT OR Apache-2.0; MIT OR Apache-2.0 OR Zlib | JPEG decode paths |
| `png` / `lodepng` / `oxipng` | `0.18.1` / `3.12.2` / `10.1.1` | MIT OR Apache-2.0; Zlib; MIT | PNG decode/encode and optimization |
| `libwebp-sys` | `0.14.4` | MIT wrapper; bundled libwebp notice is BSD-3-Clause | WebP native codec binding |
| `mozjpeg-sys` | `2.2.3` | IJG AND Zlib AND BSD-3-Clause | MozJPEG native codec binding |
| `libavif` / `libavif-sys` / `libaom-sys` | `0.14.0` / `0.17.0+libavif.1.0.4` / `0.17.2+libaom.3.11.0` | BSD-2-Clause | Extended AVIF code present in the upstream build graph |
| `resvg` / `usvg` / `svgtypes` / `tiny-skia` | `0.47.0` / `0.47.0` / `0.16.1` / `0.12.0` | Apache-2.0 OR MIT; BSD-3-Clause for `tiny-skia` | Extended SVG code present in the upstream build graph |
| `unicode-ident` | `1.0.24` | (MIT OR Apache-2.0) AND Unicode-3.0 | Unicode identifier tables used by proc-macro dependencies |
| `windows` | `0.62.2` | MIT OR Apache-2.0 | Windows-only WIC binding; no HEVC codec is redistributed |
| `objc2` / `objc2-image-io` | `0.6.4` / `0.3.2` | MIT; Zlib OR Apache-2.0 OR MIT | macOS-only ImageIO binding; no HEVC codec is redistributed |

The native source graph contains capabilities beyond UnicodeArtJs's stable
PNG/JPEG/WebP/BMP API. They remain in the notice map because redistribution
obligations follow the packaged binary, not only the methods invoked by Core.

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
- The 13-target Cargo source-resolution map contains no missing license field
  after applying the upstream repository MIT license to `napi_rs_image`; no
  GPL, AGPL, LGPL-only, MPL, EPL, or CDDL expression appears in that resolved
  published-target set. SPDX `OR` expressions are evaluated through a Clean
  permissive choice; changing that choice requires a new review.
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

The focused static check is `npm run native-components:check`.

It verifies the native package versions, rejects legacy default dependencies,
executes real Node text-rendering smoke tests in both the workspace and a
fresh Core tarball installation, packages and inspects the VSIX, and checks the
Core/CLI shared fixtures. The detailed commands are in
[`release-gate.md`](release-gate.md).
