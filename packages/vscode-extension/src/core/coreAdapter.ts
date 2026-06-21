import {
  OutputFormat,
  PresetCharset,
  imageToArt,
  textToArt,
  type ArtConfig,
  type ArtResult,
  type CharsetConfig,
} from 'unicode-art-js';
import type { ExtensionArtConfig } from '../config/types';

export interface CoreAdapter {
  convertText(text: string, config: ExtensionArtConfig): Promise<ArtResult>;
  convertImage(imagePath: string, config: ExtensionArtConfig): Promise<ArtResult>;
}

export function createCoreAdapter(): CoreAdapter {
  return {
    async convertText(text: string, config: ExtensionArtConfig): Promise<ArtResult> {
      return textToArt(text.length === 0 ? ' ' : text, toCoreConfig(config));
    },
    async convertImage(imagePath: string, config: ExtensionArtConfig): Promise<ArtResult> {
      return imageToArt(imagePath, toCoreConfig(config));
    },
  };
}

function toCoreConfig(config: ExtensionArtConfig): Partial<ArtConfig> {
  return {
    height: config.height,
    width: config.width,
    charset: toCoreCharset(config),
    font: config.font,
    matrixSize: config.matrixSize,
    ratio: config.ratio,
    invert: config.invert,
    fontReduce: config.fontReduce,
    trimTrailingSpaces: config.trimTrailingSpaces,
    box: config.box,
    outputFormat: OutputFormat.PLAIN_TEXT,
    enableEarlyTermination: true,
  };
}

function toCoreCharset(config: ExtensionArtConfig): CharsetConfig {
  if (config.charset === PresetCharset.CUSTOM) {
    return {
      type: PresetCharset.CUSTOM,
      customChars: config.customChars || undefined,
    };
  }

  if (isPresetCharset(config.charset)) {
    return { type: config.charset };
  }

  return { type: PresetCharset.ASCII };
}

function isPresetCharset(value: string): value is PresetCharset {
  return Object.values(PresetCharset).includes(value as PresetCharset);
}
