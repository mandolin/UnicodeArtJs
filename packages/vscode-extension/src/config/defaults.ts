import type { ExtensionArtConfig } from './types';

export const DEFAULT_EXTENSION_CONFIG: ExtensionArtConfig = {
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
