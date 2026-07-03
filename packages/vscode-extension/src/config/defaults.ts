import type { ExtensionArtConfig } from './types';

export const DEFAULT_EXTENSION_CONFIG: ExtensionArtConfig = {
  height: 20,
  width: undefined,
  charset: 'ASCII',
  customChars: '',
  font: 'Arial',
  matrixSize: 6,
  ratio: 2,
  invert: false,
  fontReduce: 0,
  trimTrailingSpaces: false,
  box: false,
  insertMode: 'replaceSelection',
  preset: 'default',
  locale: 'zh-CN',
};
