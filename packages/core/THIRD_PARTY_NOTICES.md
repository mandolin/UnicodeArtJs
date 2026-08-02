# Third-Party Notices

This package includes native runtime dependencies for Node.js image decoding and
text rasterization. They are installed as platform-specific npm packages.
UnicodeArtJs does not bundle fonts.

The inventory and verification procedure are documented in the repository's
[runtime component inventory](https://github.com/mandolin/UnicodeArtJs/blob/main/docs/runtime-sbom.md).
This file is included in the npm package so downstream redistributors receive
the notices with the Core runtime.

## @napi-rs/canvas 1.0.2

Copyright (c) the `@napi-rs/canvas` contributors.

Licensed under the MIT License:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions: The above copyright
> notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

The platform binary is produced with the Skia graphics backend. The following
upstream notices are relevant to its rasterization and text stack:

- **Skia**: BSD 3-Clause. Copyright (c) 2011 Google Inc. Redistribution and
  use in source and binary forms, with or without modification, are permitted
  provided that source redistributions retain the copyright notice, conditions,
  and disclaimer; binary redistributions reproduce them in documentation or
  other materials; and neither the copyright holder nor contributors' names are
  used to endorse derived products without permission. THE SOFTWARE IS PROVIDED
  "AS IS" WITHOUT WARRANTIES, AND THE COPYRIGHT HOLDERS AND CONTRIBUTORS ARE
  NOT LIABLE FOR DAMAGES ARISING FROM ITS USE.
- **FreeType**: FreeType License (FTL). Portions of this software are copyright
  The FreeType Project (https://freetype.org). The FTL permits royalty-free use,
  modification, distribution, and sublicensing; binary distribution requires a
  disclaimer that the software is based in part on the work of the FreeType
  Team. THE FREETYPE PROJECT IS PROVIDED "AS IS" WITHOUT WARRANTY.
- **HarfBuzz**: MIT-style license. Copyright (c) HarfBuzz contributors.
  Permission is granted, without written agreement or royalty fees, to use,
  copy, modify, and distribute this software and documentation for any purpose,
  provided that the copyright notice and the following warranty disclaimer
  appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE COPYRIGHT
  HOLDER HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
  ENHANCEMENTS, OR MODIFICATIONS.
- **ICU data (`icudtl.dat`)**: Unicode License v3. Copyright (c) Unicode, Inc.
  Permission is granted, free of charge, to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell the data files or software, provided this
  copyright and permission notice appears with all copies or associated
  documentation. THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS" WITHOUT
  WARRANTY. The ICU source distribution also carries component-specific notices
  for its included data; the authoritative full text is available at
  https://github.com/unicode-org/icu/blob/main/LICENSE.

The notices above are supplied for the platform binary distributed through the
`@napi-rs/canvas` package. They do not grant a right to use project names as an
endorsement.

## @napi-rs/image 1.14.0

Copyright (c) 2020-present LongYinan and the `@napi-rs/image`
contributors.

Licensed under the MIT License; the MIT terms reproduced for
`@napi-rs/canvas` above apply here as well. The package is fixed to upstream
commit `9e93ec3ee7158163f874579471882bec07cf4572`.

The complete machine-readable source-resolution audit is shipped next to this
notice as `NATIVE_COMPONENTS.json`. It records 172 normal/build components,
their resolved versions and SPDX expressions, and membership in the 13 targets
declared by `@napi-rs/image@1.14.0`. The redistribution-facing anchors are:

| Component | Version | License |
| --- | --- | --- |
| `napi_rs_image` | `0.0.0` at the fixed upstream commit | MIT repository license |
| `napi`, `napi-derive`, `napi-build` | `3.12.0`, `3.6.2`, `2.4.0` | MIT |
| `image`, `fast_image_resize` | `0.25.10`, `6.1.0` | MIT OR Apache-2.0 |
| `jpeg-decoder`, `zune-jpeg` | `0.3.2`, `0.5.15` | MIT OR Apache-2.0; MIT OR Apache-2.0 OR Zlib |
| `png`, `lodepng`, `oxipng` | `0.18.1`, `3.12.2`, `10.1.1` | MIT OR Apache-2.0; Zlib; MIT |
| `libwebp-sys` / libwebp | `0.14.4` | MIT wrapper; bundled library BSD-3-Clause |
| `mozjpeg-sys` / MozJPEG | `2.2.3` | IJG AND Zlib AND BSD-3-Clause |
| `libavif`, `libavif-sys`, `libaom-sys` | `0.14.0`, `0.17.0+libavif.1.0.4`, `0.17.2+libaom.3.11.0` | BSD-2-Clause |
| `resvg`, `usvg`, `svgtypes`, `tiny-skia` | `0.47.0`, `0.47.0`, `0.16.1`, `0.12.0` | Apache-2.0 OR MIT; `tiny-skia` BSD-3-Clause |
| `rexif`, `rgb`, `tiff` | `0.7.5`, `0.8.53`, `0.11.3` | MIT |
| `unicode-ident` | `1.0.24` | (MIT OR Apache-2.0) AND Unicode-3.0 |
| `windows` | `0.62.2` | MIT OR Apache-2.0 |
| `objc2`, `objc2-image-io` | `0.6.4`, `0.3.2` | MIT; Zlib OR Apache-2.0 OR MIT |

Relevant native-library notices include:

- **libwebp**: Copyright (c) 2010, Google Inc. All rights reserved. Licensed
  under the BSD 3-Clause license. Source and full terms:
  https://chromium.googlesource.com/webm/libwebp.
- **libavif**: Copyright 2019 Joe Drago. All rights reserved. Licensed under
  the BSD 2-Clause license. Source and full terms:
  https://github.com/AOMediaCodec/libavif.
- **libavif-rs**: Copyright 2020 Charles Samuels and Paolo Barbolini. Licensed
  under the BSD 2-Clause license. Source and full terms:
  https://github.com/njaard/libavif-rs.
- **lodepng**: Copyright 2014-2017 Kornel Lesiński and 2005-2016 Lode
  Vandevenne. Licensed under the Zlib license. Source and full terms:
  https://github.com/kornelski/lodepng-rust.
- **MozJPEG / mozjpeg-sys**: licensed under the combined IJG, Zlib, and BSD
  3-Clause terms recorded by `mozjpeg-sys@2.2.3`. Source and full terms:
  https://github.com/mozilla/mozjpeg and
  https://crates.io/crates/mozjpeg-sys/2.2.3.
- **Unicode identifier data**: `unicode-ident@1.0.24` carries Unicode-3.0 in
  addition to its MIT-or-Apache choice. Copyright and permission terms are
  maintained by Unicode, Inc. at https://www.unicode.org/license.txt.

Its stable UnicodeArtJs input path is limited to PNG, JPEG, WebP, and BMP.
SVG, TIFF, AVIF, HEIC, and other extended capabilities in the upstream native
source graph are not part of this package's stable Core contract, but remain in
this notice because redistribution follows the packaged binary rather than the
subset of methods invoked by Core. The upstream commit does not contain a
`Cargo.lock`; `NATIVE_COMPONENTS.json` is therefore a fixed source-resolution
audit snapshot, not a bit-exact SBOM for the published native binaries.

## UnicodeArtJs

UnicodeArtJs is licensed under the MIT License. See `LICENSE`.

This notice is an engineering inventory, not legal advice. Redistributors that
change native dependency versions or platforms must repeat the audit and update
the notices before distribution.
