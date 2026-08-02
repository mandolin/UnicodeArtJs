# Third-Party Notices

The UnicodeArtJs VSCode extension packages the `unicode-art-js` Core runtime
and its platform-native Node dependencies inside the VSIX. The complete Core
notice is included at:

```text
extension/node_modules/unicode-art-js/THIRD_PARTY_NOTICES.md
extension/node_modules/unicode-art-js/NATIVE_COMPONENTS.json
```

The extension package also carries this short notice so the VSIX has an
immediately visible redistribution boundary:

- `@napi-rs/canvas@1.0.2` (MIT), with Skia (BSD-3-Clause), FreeType (FTL),
  HarfBuzz (MIT-style), and ICU data (Unicode-3.0) notices.
- `@napi-rs/image@1.14.0` (MIT), used for the Core stable PNG/JPEG/WebP/BMP
  image-input path. Its fixed-source audit map contains 172 normal/build
  components across the package's 13 declared targets. Redistribution-facing
  entries include libwebp (BSD-3-Clause), libavif/libaom (BSD-2-Clause),
  lodepng (Zlib), mozjpeg (IJG AND Zlib AND BSD-3-Clause), and Unicode-3.0
  data terms from `unicode-ident`.

UnicodeArtJs itself is MIT licensed. It does not redistribute fonts.

See the full repository [runtime component inventory](https://github.com/mandolin/UnicodeArtJs/blob/main/docs/runtime-sbom.md).
This file is an engineering notice, not legal advice. A redistributed VSIX that
changes native runtime versions or target platforms must be re-audited.
