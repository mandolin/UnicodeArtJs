import * as vscode from 'vscode';
import type { ExtensionArtConfig } from './types';

const RECENT_CONFIG_KEY = 'unicodeArtJs.recentConfig';

export function loadRecentConfig(context: vscode.ExtensionContext): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(RECENT_CONFIG_KEY);
}

export async function saveRecentConfig(
  context: vscode.ExtensionContext,
  config: ExtensionArtConfig
): Promise<void> {
  await context.globalState.update(RECENT_CONFIG_KEY, sanitizeConfig(config));
}

function sanitizeConfig(config: ExtensionArtConfig): ExtensionArtConfig {
  return {
    ...config,
    width: typeof config.width === 'number' ? config.width : undefined,
    customChars: config.customChars ?? '',
    visualFont: config.visualFont || config.font || 'Arial',
    font: config.font || 'Arial',
    glyphFont: config.glyphFont || "Consolas, 'Courier New', monospace",
    glyphWidthProfile: config.glyphWidthProfile || 'default',
    wideCharRegex: config.wideCharRegex || '',
    outputTarget: 'vscode',
    preset: config.preset || 'default',
  };
}
