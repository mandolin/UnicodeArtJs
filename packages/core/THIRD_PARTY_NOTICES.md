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

Copyright (c) the `@napi-rs/image` contributors.

Licensed under the MIT License; the MIT terms reproduced for
`@napi-rs/canvas` above apply here as well. Its stable UnicodeArtJs input path
is limited to PNG, JPEG, WebP, and BMP. The audited native dependency family uses
permissive licenses, including MIT, Apache-2.0, BSD-3-Clause, and Zlib for the
relevant image codecs and bindings. SVG, TIFF, and other extended formats are
not part of this package's stable Core contract.

## UnicodeArtJs

UnicodeArtJs is licensed under the MIT License. See `LICENSE`.

This notice is an engineering inventory, not legal advice. Redistributors that
change native dependency versions or platforms must repeat the audit and update
the notices before distribution.
