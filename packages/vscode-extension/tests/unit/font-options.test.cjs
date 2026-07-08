const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeVisualFontFamily,
  VISUAL_FONT_OPTIONS,
} = require('../../dist/config/fontOptions.js');

test('normalizeVisualFontFamily maps localized Chinese font names for node-canvas', () => {
  assert.equal(normalizeVisualFontFamily('黑体'), 'SimHei');
  assert.equal(normalizeVisualFontFamily('宋体'), 'SimSun');
  assert.equal(normalizeVisualFontFamily('新宋体'), 'NSimSun');
  assert.equal(normalizeVisualFontFamily('微软雅黑'), 'Microsoft YaHei');
});

test('visual font options keep localized and canonical names discoverable', () => {
  assert.equal(VISUAL_FONT_OPTIONS.includes('Noto Sans SC'), true);
  assert.equal(VISUAL_FONT_OPTIONS.includes('Source Han Sans SC'), true);
  assert.equal(VISUAL_FONT_OPTIONS.includes('黑体'), false);
  assert.equal(VISUAL_FONT_OPTIONS.includes('SimHei'), false);
});
