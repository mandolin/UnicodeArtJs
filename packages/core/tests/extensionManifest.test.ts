import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateUnicodeArtExtensionCompatibility,
  isPermissiveUnicodeArtExtensionLicense,
  parseUnicodeArtExtensionManifestJson,
  validateUnicodeArtExtensionManifest
} from '../src';
import { ErrorCode, UnicodeArtError } from '../src/types/output';

describe('UnicodeArtJs declarative extension manifests', () => {
  test('normalizes a v1 local resource manifest and evaluates a compatible host', () => {
    const manifest = validateUnicodeArtExtensionManifest(createReferenceManifest());

    expect(manifest).toMatchObject({
      format: 'unicode-art-extension',
      version: 1,
      meta: { id: 'org.unicodeartjs.line-banner' },
      capabilities: ['unicode-art-font', 'semantic-document'],
      compatibility: { minCoreVersion: '1.2.1', targets: ['cli', 'web'] }
    });
    expect(evaluateUnicodeArtExtensionCompatibility(manifest, {
      target: 'cli',
      coreVersion: '1.2.1',
      capabilities: ['unicode-art-font', 'semantic-document']
    })).toEqual({ compatible: true, reasons: [] });
  });

  test('returns every deterministic compatibility reason without loading a resource', () => {
    const manifest = validateUnicodeArtExtensionManifest(createReferenceManifest({
      compatibility: { minCoreVersion: '1.3.0', maxCoreVersionExclusive: '1.4.0', targets: ['web'] }
    }));
    expect(evaluateUnicodeArtExtensionCompatibility(manifest, {
      target: 'cli',
      coreVersion: '1.2.1',
      capabilities: ['unicode-art-font']
    })).toEqual({
      compatible: false,
      reasons: [
        { code: 'targetUnsupported', value: 'cli' },
        { code: 'coreVersionTooOld', value: '1.3.0' },
        { code: 'capabilityMissing', value: 'semantic-document' }
      ]
    });
    expect(evaluateUnicodeArtExtensionCompatibility(manifest, {
      target: 'web',
      coreVersion: '1.4.0',
      capabilities: ['unicode-art-font', 'semantic-document']
    })).toEqual({
      compatible: false,
      reasons: [{ code: 'coreVersionTooNew', value: '1.4.0' }]
    });
  });

  test('rejects JSON errors, unknown fields, unsafe paths and undeclared resource capabilities', () => {
    expectUnicodeArtError(
      () => parseUnicodeArtExtensionManifestJson('{'),
      ErrorCode.EXTENSION_MANIFEST_PARSE_FAILED
    );
    expectUnicodeArtError(
      () => validateUnicodeArtExtensionManifest({ ...createReferenceManifest(), typo: true }),
      ErrorCode.EXTENSION_MANIFEST_INVALID
    );
    expectUnicodeArtError(
      () => validateUnicodeArtExtensionManifest(createReferenceManifest({
        resources: [{ id: 'unsafe', kind: 'unicode-art-font', path: '../escape.uafont.json' }]
      })),
      ErrorCode.EXTENSION_MANIFEST_INVALID
    );
    expectUnicodeArtError(
      () => validateUnicodeArtExtensionManifest(createReferenceManifest({
        resources: [{ id: 'control', kind: 'unicode-art-font', path: 'assets/line\nfont.uafont.json' }]
      })),
      ErrorCode.EXTENSION_MANIFEST_INVALID
    );
    expectUnicodeArtError(
      () => validateUnicodeArtExtensionManifest(createReferenceManifest({
        capabilities: ['unicode-art-font'],
        resources: [{ id: 'document', kind: 'semantic-document', path: 'assets/demo.uadoc.json' }]
      })),
      ErrorCode.EXTENSION_MANIFEST_INVALID
    );
  });

  test('keeps official bundle policy separate from manifest syntax', () => {
    expect(isPermissiveUnicodeArtExtensionLicense('MIT OR Apache-2.0')).toBe(true);
    expect(isPermissiveUnicodeArtExtensionLicense('GPL-3.0-only')).toBe(false);
  });

  test('keeps the official Line Banner manifest as a declaration-only compatible package', () => {
    const manifestPath = resolve(__dirname, '..', '..', 'extension-line-banner', 'unicode-art-extension.json');
    const manifest = parseUnicodeArtExtensionManifestJson(readFileSync(manifestPath, 'utf8'));

    expect(manifest.meta.id).toBe('org.unicodeartjs.line-banner');
    expect(manifest.meta.license).toMatchObject({ expression: 'MIT', origin: 'original' });
    expect(manifest.resources.map((resource) => [resource.id, resource.kind, resource.path]).sort()).toEqual([
      ['banner-template', 'semantic-document', 'assets/banner-template.uadoc.json'],
      ['block-poster-font', 'unicode-art-font', 'assets/block-poster-font.uafont.json'],
      ['line-font', 'unicode-art-font', 'assets/line-font.uafont.json'],
      ['poster-template', 'semantic-document', 'assets/poster-template.uadoc.json']
    ]);

    for (const target of ['cli', 'web', 'vscode', 'desktop'] as const) {
      expect(evaluateUnicodeArtExtensionCompatibility(manifest, {
        target,
        coreVersion: '1.2.1',
        capabilities: ['unicode-art-font', 'semantic-document']
      })).toEqual({ compatible: true, reasons: [] });
    }
  });
});

function createReferenceManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = {
    format: 'unicode-art-extension',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.line-banner',
      name: 'Line Banner',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' },
      creation: { method: 'human', tool: 'test-fixture' }
    },
    capabilities: ['unicode-art-font', 'semantic-document'],
    compatibility: { minCoreVersion: '1.2.1', targets: ['cli', 'web'] },
    resources: [
      { id: 'line-font', kind: 'unicode-art-font', path: 'assets/line-font.uafont.json' },
      { id: 'banner-template', kind: 'semantic-document', path: 'assets/banner-template.uadoc.json' }
    ]
  };
  return { ...base, ...overrides };
}

function expectUnicodeArtError(action: () => unknown, code: ErrorCode): void {
  try {
    action();
    throw new Error('Expected UnicodeArtError');
  } catch (error) {
    expect(error).toBeInstanceOf(UnicodeArtError);
    expect((error as UnicodeArtError).code).toBe(code);
  }
}
