const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;
Module._load = function mockVscode(request, parent, isMain) {
  if (request === 'vscode') return {};
  return originalLoad.call(this, request, parent, isMain);
};

const {
  TEMPLATE_SLOT_COUNT,
  getTemplateSlotSummaries,
  loadDefaultTemplate,
  loadRecentConfig,
  loadTemplateSlot,
  saveDefaultTemplate,
  saveRecentConfig,
  saveTemplateSlot,
} = require('../../dist/config/presetStore.js');

Module._load = originalLoad;

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
  box: false,
  insertMode: 'replaceSelection',
  preset: 'default',
  locale: 'zh-CN',
  outputTarget: 'vscode',
};

test('saveRecentConfig sanitizes font aliases and optional fields', async () => {
  const context = createMockContext();

  await saveRecentConfig(context, {
    ...baseConfig,
    width: null,
    visualFont: '',
    font: 'Noto Sans SC',
    glyphFont: '',
    glyphWidthProfile: '',
    outputTarget: 'browser',
  });

  const saved = loadRecentConfig(context);
  assert.equal(saved.width, undefined);
  assert.equal(saved.visualFont, 'Noto Sans SC');
  assert.equal(saved.font, 'Noto Sans SC');
  assert.equal(saved.glyphFont, "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace");
  assert.equal(saved.glyphWidthProfile, 'default');
  assert.equal(saved.outputTarget, 'vscode');
});

test('default template is stored with default preset', async () => {
  const context = createMockContext();

  await saveDefaultTemplate(context, { ...baseConfig, preset: 'template-2' });

  assert.equal(loadDefaultTemplate(context).preset, 'default');
});

test('template slots save, load, summarize, and reject unsupported slots', async () => {
  const context = createMockContext();

  await saveTemplateSlot(context, 2, { ...baseConfig, preset: '' });

  assert.equal(TEMPLATE_SLOT_COUNT, 3);
  assert.equal(loadTemplateSlot(context, 2).preset, 'template-2');
  assert.equal(loadTemplateSlot(context, 1), undefined);

  const summaries = getTemplateSlotSummaries(context);
  assert.equal(summaries.length, 3);
  assert.deepEqual(summaries.map((item) => item.configured), [false, true, false]);
  assert.equal(summaries[1].preset, 'template-2');

  await assert.rejects(() => saveTemplateSlot(context, 0, baseConfig), /Unsupported UnicodeArtJs template slot/);
  assert.throws(() => loadTemplateSlot(context, 4), /Unsupported UnicodeArtJs template slot/);
});

function createMockContext() {
  const values = new Map();
  return {
    globalState: {
      get(key) {
        return values.get(key);
      },
      async update(key, value) {
        values.set(key, value);
      },
    },
  };
}
