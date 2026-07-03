import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveDefaultTemplate, saveTemplateSlot, TEMPLATE_SLOT_COUNT } from '../config/presetStore';
import type { ExtensionLogger } from '../utils/logger';

export async function saveCurrentPreset(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const config = resolveArtConfig(context);
  const target = await vscode.window.showQuickPick([
    {
      label: 'Default Template',
      description: 'Used by the editor context menu default template command.',
      slot: 0,
    },
    ...Array.from({ length: TEMPLATE_SLOT_COUNT }, (_, index) => {
      const slot = index + 1;
      return {
        label: `Template ${slot}`,
        description: `Used by the editor context menu Template ${slot} command.`,
        slot,
      };
    }),
  ], {
    title: 'UnicodeArtJs Save Template',
    placeHolder: 'Choose where to save the current configuration.',
  });
  if (!target) return;

  if (target.slot === 0) {
    await saveDefaultTemplate(context, config);
    logger.info('Saved current default template.');
    await vscode.window.showInformationMessage('UnicodeArtJs default template saved.');
    return;
  }

  await saveTemplateSlot(context, target.slot, { ...config, preset: `template-${target.slot}` });
  logger.info(`Saved current template slot. slot=${target.slot}`);
  await vscode.window.showInformationMessage(`UnicodeArtJs Template ${target.slot} saved.`);
}
