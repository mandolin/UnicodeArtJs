const assert = require('node:assert/strict');
const test = require('node:test');
const { mergeExtensionConfig } = require('../../dist/config/configMerge.js');

const baseConfig = {
  height: 20,
  width: undefined,
  charset: 'ASCII',
  customChars: '',
  visualFont: 'Noto Sans SC',
  font: 'Noto Sans SC',
  glyphFont: "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace",
  glyphWidthProfile: 'default',
  wideCharRegex: '',
  matrixSize: 6,
  ratio: 2,
  invert: false,
  fontReduce: 0,
  trimTrailingSpaces: false,
  box: { enabled: true, style: 'round', padding: 1, margin: 0 },
  insertMode: 'replaceSelection',
  preset: 'default',
  locale: 'zh-CN',
  outputTarget: 'vscode',
};

test('mergeExtensionConfig keeps base config when patch is undefined', () => {
  assert.equal(mergeExtensionConfig(baseConfig, undefined), baseConfig);
});

test('mergeExtensionConfig overlays scalar fields', () => {
  const merged = mergeExtensionConfig(baseConfig, {
    height: 32,
    charset: 'CUSTOM',
    customChars: '@# ',
    glyphFont: "'LXGW WenKai Mono', 'Source Code Pro', monospace",
    insertMode: 'newDocument',
  });

  assert.equal(merged.height, 32);
  assert.equal(merged.charset, 'CUSTOM');
  assert.equal(merged.customChars, '@# ');
  assert.equal(merged.glyphFont, "'LXGW WenKai Mono', 'Source Code Pro', monospace");
  assert.equal(merged.insertMode, 'newDocument');
  assert.deepEqual(merged.box, baseConfig.box);
});

test('mergeExtensionConfig allows explicitly disabling box', () => {
  const merged = mergeExtensionConfig(baseConfig, { box: false });
  assert.equal(merged.box, false);
});
