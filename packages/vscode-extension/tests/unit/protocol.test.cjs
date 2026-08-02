/**
 * @lang zh-CN 验证不可信 WebView 消息只有在精确字段、枚举、范围、长度与配置白名单均满足时才能进入宿主。
 * @lang en Verifies that untrusted WebView messages reach the host only when exact fields, enums, ranges, lengths, and configuration allowlists all pass.
 */
const assert = require('node:assert/strict');
const test = require('node:test');
const { isWebviewMessage } = require('../../dist/webview/protocol.js');

/**
 * Creates the complete configuration shape emitted by the Converter UI.
 *
 * @param {object} overrides - <lang><zh-CN>用于单项边界测试的字段覆盖。</zh-CN><en>Field overrides used by individual boundary tests.</en></lang>
 * @returns {object} <lang><zh-CN>满足持久化模板协议的完整配置。</zh-CN><en>Complete configuration satisfying the persisted-template protocol.</en></lang>
 */
function config(overrides = {}) {
  // <lang><zh-CN>该基线故意只使用 WebView 当前可生成的简单 Box 形态，不把 Core 高级 Box 对象扩大为消息协议。</zh-CN><en>This baseline deliberately uses only the simple Box shape emitted by the current WebView and does not expand advanced Core Box objects into the message protocol.</en></lang>
  return {
    height: 20,
    width: undefined,
    charset: 'ASCII',
    customChars: '',
    visualFont: 'Noto Sans SC',
    font: 'Noto Sans SC',
    glyphFont: 'Sarasa Mono SC',
    glyphWidthProfile: 'default',
    wideCharRegex: '',
    matrixSize: 6,
    ratio: 2,
    invert: false,
    fontReduce: 0,
    trimTrailingSpaces: false,
    box: { enabled: true, style: 'round', padding: 1, margin: 0, shadow: false },
    insertMode: 'replaceSelection',
    preset: 'default',
    locale: 'zh-CN',
    outputTarget: 'vscode',
    ...overrides,
  };
}

test('isWebviewMessage accepts every supported message branch', () => {
  // <lang><zh-CN>有效样例覆盖握手、两类转换、取消、预设、剪贴板、编辑器插入和两种文件保存路径。</zh-CN><en>Valid samples cover handshake, both conversions, cancellation, presets, clipboard, editor insertion, and both file-save paths.</en></lang>
  const validMessages = [
    { type: 'ready' },
    { type: 'convertText', payload: { text: 'UnicodeArtJs', config: { height: 12 }, requestId: 'req-1' } },
    {
      type: 'convertImage',
      payload: {
        imageData: 'data:image/png;base64,AA==',
        fileName: 'sample.png',
        fileSize: 1,
        mimeType: 'image/png',
        config: { width: 40 },
        requestId: 'req-2',
      },
    },
    { type: 'cancel', payload: { requestId: 'req-1' } },
    { type: 'copy', payload: { content: 'abc' } },
    { type: 'insert', payload: { content: 'abc', mode: 'newDocument' } },
    { type: 'save', payload: { content: 'abc', format: 'txt' } },
    { type: 'save', payload: { content: 'abc', format: 'html', glyphFont: 'Sarasa Mono SC' } },
    { type: 'savePreset', payload: { config: config(), target: 'default' } },
    { type: 'savePreset', payload: { config: config({ preset: 'template-2' }), target: 'slot', slot: 2 } },
  ];

  // <lang><zh-CN>每个独立协议分支都必须通过同一个公开 gate。</zh-CN><en>Every independent protocol branch must pass through the same public gate.</en></lang>
  for (const message of validMessages) {
    assert.equal(isWebviewMessage(message), true, `expected valid message: ${message.type}`);
  }
});

test('isWebviewMessage rejects malformed shapes and undeclared fields', () => {
  // <lang><zh-CN>额外字段即使看似无害也会被拒绝，避免后续实现无意赋予它新语义。</zh-CN><en>Extra fields are rejected even when apparently harmless so later implementations cannot accidentally grant them new semantics.</en></lang>
  const malformedMessages = [
    null,
    [],
    { type: 'unknown' },
    { type: 'ready', payload: {} },
    { type: 'ready', extra: true },
    { type: 'convertText', payload: { requestId: 'req-1' } },
    { type: 'convertText', payload: { text: 'abc', path: 'C:\\private.txt' } },
    { type: 'cancel', payload: { requestId: 1 } },
    { type: 'cancel', payload: { requestId: 'req-1', force: true } },
    { type: 'copy', payload: { value: 'abc' } },
    { type: 'insert', payload: { content: 'abc' } },
    { type: 'save', payload: { format: 'txt' } },
    { type: 'savePreset', payload: { target: 'default' } },
  ];

  for (const message of malformedMessages) {
    assert.equal(isWebviewMessage(message), false);
  }
});

test('isWebviewMessage rejects invalid enums, ranges, paths, and MIME mismatches', () => {
  // <lang><zh-CN>这些样例固定所有会跨入配置、文件或编辑器副作用边界的标量限制。</zh-CN><en>These samples pin scalar limits that cross into configuration, file, or editor side-effect boundaries.</en></lang>
  const invalidMessages = [
    { type: 'convertText', payload: { text: 'abc', requestId: '' } },
    { type: 'convertText', payload: { text: 'abc', config: { height: 0 } } },
    { type: 'convertText', payload: { text: 'abc', config: { unknown: true } } },
    {
      type: 'convertImage',
      payload: { imageData: 'data:image/png;base64,AA==', fileName: '../sample.png', fileSize: 1, mimeType: 'image/png' },
    },
    {
      type: 'convertImage',
      payload: { imageData: 'data:image/png;base64,AA==', fileName: 'sample.png', fileSize: 1, mimeType: 'image/jpeg' },
    },
    {
      type: 'convertImage',
      payload: { imageData: 'data:image/svg+xml;base64,AA==', fileName: 'sample.svg', fileSize: 1, mimeType: 'image/svg+xml' },
    },
    {
      type: 'convertImage',
      payload: { imageData: 'data:image/png;base64,', fileName: 'empty.png', fileSize: 0, mimeType: 'image/png' },
    },
    { type: 'insert', payload: { content: 'abc', mode: 'overwriteWorkspace' } },
    { type: 'save', payload: { content: 'abc', format: 'png' } },
    { type: 'save', payload: { content: 'abc', format: 'txt', glyphFont: 'unexpected' } },
    { type: 'savePreset', payload: { config: config({ charset: 'UNKNOWN' }), target: 'default' } },
    { type: 'savePreset', payload: { config: config(), target: 'slot', slot: 4 } },
    { type: 'savePreset', payload: { config: config(), target: 'default', slot: 1 } },
  ];

  for (const message of invalidMessages) {
    assert.equal(isWebviewMessage(message), false);
  }
});
