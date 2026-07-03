const assert = require('node:assert/strict');
const test = require('node:test');
const { isWebviewMessage } = require('../../dist/webview/protocol.js');

test('isWebviewMessage accepts ready message', () => {
  assert.equal(isWebviewMessage({ type: 'ready' }), true);
});

test('isWebviewMessage accepts text conversion with text payload', () => {
  assert.equal(isWebviewMessage({
    type: 'convertText',
    payload: { text: 'UnicodeArtJs', requestId: 'req-1' },
  }), true);
});

test('isWebviewMessage rejects text conversion without text', () => {
  assert.equal(isWebviewMessage({
    type: 'convertText',
    payload: { requestId: 'req-1' },
  }), false);
});

test('isWebviewMessage accepts image, cancel, save, and insert messages', () => {
  assert.equal(isWebviewMessage({ type: 'convertImage', payload: { imageData: 'data:image/png;base64,AA==' } }), true);
  assert.equal(isWebviewMessage({ type: 'cancel', payload: { requestId: 'req-1' } }), true);
  assert.equal(isWebviewMessage({ type: 'save', payload: { content: 'abc', format: 'txt' } }), true);
  assert.equal(isWebviewMessage({ type: 'save', payload: { content: 'abc', format: 'html', glyphFont: 'NSimSun' } }), true);
  assert.equal(isWebviewMessage({ type: 'insert', payload: { content: 'abc', mode: 'newDocument' } }), true);
  assert.equal(isWebviewMessage({ type: 'savePreset', payload: { config: {}, target: 'default' } }), true);
  assert.equal(isWebviewMessage({ type: 'savePreset', payload: { config: {}, target: 'slot', slot: 2 } }), true);
});

test('isWebviewMessage rejects malformed messages', () => {
  assert.equal(isWebviewMessage(null), false);
  assert.equal(isWebviewMessage({ type: 'unknown' }), false);
  assert.equal(isWebviewMessage({ type: 'copy', payload: { value: 'abc' } }), false);
  assert.equal(isWebviewMessage({ type: 'save', payload: { content: 'abc', format: 'png' } }), false);
});
