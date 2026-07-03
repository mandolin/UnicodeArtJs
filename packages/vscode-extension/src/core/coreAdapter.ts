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
import { normalizeVisualFontFamily } from '../config/fontOptions';

export interface CoreAdapter {
  convertText(text: string, config: ExtensionArtConfig): Promise<ArtResult>;
  convertImage(imagePath: string, config: ExtensionArtConfig): Promise<ArtResult>;
}

type CoreUnifiedConfig = Partial<ArtConfig> & {
  visualFont?: {
    family?: string;
    reduce?: number;
  };
  glyphFont?: {
    family?: string;
    widthProfile?: string;
    wideCharRegex?: string;
  };
  glyphFontFamily?: string;
  glyphWidthProfile?: string;
  wideCharRegex?: string;
  outputTarget?: string;
  locale?: string;
};

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
  const visualFontFamily = normalizeVisualFontFamily(config.visualFont || config.font);
  const coreConfig: CoreUnifiedConfig = {
    height: config.height,
    width: config.width,
    charset: toCoreCharset(config),
    visualFont: {
      family: visualFontFamily,
      reduce: config.fontReduce,
    },
    glyphFont: {
      family: config.glyphFont,
      widthProfile: config.glyphWidthProfile,
      wideCharRegex: config.wideCharRegex || undefined,
    },
    font: visualFontFamily,
    glyphFontFamily: config.glyphFont,
    glyphWidthProfile: config.glyphWidthProfile,
    wideCharRegex: config.wideCharRegex || undefined,
    matrixSize: config.matrixSize,
    ratio: config.ratio,
    invert: config.invert,
    fontReduce: config.fontReduce,
    trimTrailingSpaces: config.trimTrailingSpaces,
    box: config.box,
    outputFormat: OutputFormat.PLAIN_TEXT,
    outputTarget: config.outputTarget,
    enableEarlyTermination: true,
    locale: config.locale,
  };
  return coreConfig as Partial<ArtConfig>;
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
