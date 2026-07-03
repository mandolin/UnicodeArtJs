import type { BoxOptions } from 'unicode-art-js';
import type { InsertMode } from '../output/resultWriter';

export type ExtensionLocale = 'zh-CN' | 'en-US';

export interface ExtensionArtConfig {
  height: number;
  width: number | undefined;
  charset: string;
  customChars: string;
  font: string;
  matrixSize: number;
  ratio: number;
  invert: boolean;
  fontReduce: number;
  trimTrailingSpaces: boolean;
  box: false | BoxOptions;
  insertMode: InsertMode;
  preset: string;
  locale: ExtensionLocale;
}
