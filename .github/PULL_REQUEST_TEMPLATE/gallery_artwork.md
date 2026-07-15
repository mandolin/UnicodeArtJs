# Gallery Artwork PR

## Summary

Describe the artwork and the user-facing value it adds to the static gallery.

## Checklist

- [ ] The artwork JSON is in `packages/web/public/gallery/artworks/`.
- [ ] `packages/web/public/gallery/index.json` has been updated.
- [ ] The artwork is a `semantic-document@1` `.uadoc.json` or `unicode-art-font@1` `.uafont.json`.
- [ ] The artwork is original or has clear permissive redistribution rights.
- [ ] The license expression and origin in the gallery index are accurate.
- [ ] The artwork does not depend on scripts, remote URLs, private paths, accounts, or bundled third-party fonts.
- [ ] Chinese and English title/description are both readable.
- [ ] I ran `npm run gallery:check`.
- [ ] I ran `npm --workspace packages/web test`.

## Provenance

Explain the source of the artwork. If it is original, say so directly. If it uses third-party material, include license and attribution details.

## Preview

Paste a small text preview or screenshot if useful.
