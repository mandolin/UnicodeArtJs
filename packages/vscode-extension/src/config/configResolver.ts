import * as vscode from 'vscode';
import type { BoxOptions } from 'unicode-art-js';
import { mergeExtensionConfig } from './configMerge';
import { DEFAULT_EXTENSION_CONFIG } from './defaults';
import { loadDefaultTemplate, loadRecentConfig } from './presetStore';
import type { ExtensionArtConfig } from './types';

export interface ResolveArtConfigOptions {
  includeRecent?: boolean;
}

export function resolveArtConfig(
  context?: vscode.ExtensionContext,
  options: ResolveArtConfigOptions = {}
): ExtensionArtConfig {
  const includeRecent = options.includeRecent ?? true;
  const config = vscode.workspace.getConfiguration('unicodeArtJs');
  const boxEnabled = config.get<boolean>('box.enabled', false);
  const boxTitle = config.get<string>('box.title', '');
  const boxShadow = config.get<boolean>('box.shadow', false);

  const fromSettings: ExtensionArtConfig = {
    ...DEFAULT_EXTENSION_CONFIG,
    height: config.get<number>('height', DEFAULT_EXTENSION_CONFIG.height),
    width: normalizeOptionalNumber(config.get<number | null>('width', null)),
    charset: config.get<string>('charset', DEFAULT_EXTENSION_CONFIG.charset),
    customChars: config.get<string>('customChars', DEFAULT_EXTENSION_CONFIG.customChars),
    visualFont: config.get<string>('visualFont', config.get<string>('font', DEFAULT_EXTENSION_CONFIG.visualFont)),
    font: config.get<string>('font', DEFAULT_EXTENSION_CONFIG.font),
    glyphFont: config.get<string>('glyphFont', DEFAULT_EXTENSION_CONFIG.glyphFont),
    glyphWidthProfile: config.get<string>('glyphWidthProfile', DEFAULT_EXTENSION_CONFIG.glyphWidthProfile),
    wideCharRegex: config.get<string>('wideCharRegex', DEFAULT_EXTENSION_CONFIG.wideCharRegex),
    matrixSize: config.get<number>('matrixSize', DEFAULT_EXTENSION_CONFIG.matrixSize),
    ratio: config.get<number>('ratio', DEFAULT_EXTENSION_CONFIG.ratio),
    invert: config.get<boolean>('invert', DEFAULT_EXTENSION_CONFIG.invert),
    fontReduce: config.get<number>('fontReduce', DEFAULT_EXTENSION_CONFIG.fontReduce),
    trimTrailingSpaces: config.get<boolean>('trimTrailingSpaces', DEFAULT_EXTENSION_CONFIG.trimTrailingSpaces),
    box: boxEnabled
      ? ({
          enabled: true,
          style: config.get<string>('box.style', 'round'),
          padding: config.get<number>('box.padding', 1),
          margin: config.get<number>('box.margin', 0),
          title: boxTitle.length > 0 ? boxTitle : undefined,
          shadow: boxShadow,
        } as BoxOptions)
      : false,
    insertMode: config.get<ExtensionArtConfig['insertMode']>('insertMode', DEFAULT_EXTENSION_CONFIG.insertMode),
    preset: config.get<string>('preset', DEFAULT_EXTENSION_CONFIG.preset),
    locale: resolveLocale(),
    outputTarget: 'vscode',
  };

  const defaultTemplate = context ? loadDefaultTemplate(context) : undefined;
  const baseWithTemplate = mergeExtensionConfig(fromSettings, defaultTemplate);
  const recent = context && includeRecent ? loadRecentConfig(context) : undefined;
  if (!recent) {
    return baseWithTemplate;
  }

  return mergeExtensionConfig(baseWithTemplate, recent);
}

function normalizeOptionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveLocale(): ExtensionArtConfig['locale'] {
  return vscode.env.language.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}
