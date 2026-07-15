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

/**
 * 🟢 VS Code 扩展到 Core 的转换适配器
 *
 * 🔹 隔离 Extension 配置模型与 `unicode-art-js` Core API。
 * 🔹 便于命令、WebView 和后续测试复用同一套配置转换逻辑。
 */
export interface CoreAdapter {
  /** 将选中文本或 Converter 文本转换为字符画。 */
  convertText(text: string, config: ExtensionArtConfig): Promise<ArtResult>;
  /** 将本地图片文件转换为字符画。 */
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

/**
 * 🟢 创建 Core 适配器
 *
 * @returns 可供命令和 WebView 消息处理器复用的 Core adapter。
 */
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
