import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveRecentConfig } from '../config/presetStore';
import type { ExtensionLogger } from '../utils/logger';

export async function saveCurrentPreset(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const config = resolveArtConfig(context);
  const preset = await vscode.window.showInputBox({
    title: 'UnicodeArtJs Preset Name',
    prompt: 'Name this preset for the current session.',
    value: config.preset || 'default',
    validateInput: (value) => value.trim().length === 0 ? 'Preset name cannot be empty.' : undefined,
  });
  if (!preset) return;

  const presetName = preset.trim();
  await saveRecentConfig(context, { ...config, preset: presetName });
  logger.info(`Saved current preset. preset=${presetName}`);
  await vscode.window.showInformationMessage(`UnicodeArtJs preset saved: ${presetName}`);
}
