import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveDefaultTemplate, saveTemplateSlot, TEMPLATE_SLOT_COUNT } from '../config/presetStore';
import { t } from '../i18n';
import type { ExtensionLogger } from '../utils/logger';

export async function saveCurrentPreset(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const config = resolveArtConfig(context);
  const target = await vscode.window.showQuickPick([
    {
      label: t('quickPick.defaultTemplate'),
      description: t('quickPick.defaultTemplateDesc'),
      slot: 0,
    },
    ...Array.from({ length: TEMPLATE_SLOT_COUNT }, (_, index) => {
      const slot = index + 1;
      return {
        label: t('quickPick.templateSlot', { slot }),
        description: t('quickPick.templateDesc', { slot }),
        slot,
      };
    }),
  ], {
    title: t('quickPick.saveTemplateTitle'),
    placeHolder: t('quickPick.saveTemplatePlaceHolder'),
  });
  if (!target) return;

  if (target.slot === 0) {
    await saveDefaultTemplate(context, config);
    logger.info('Saved current default template.');
    await vscode.window.showInformationMessage(t('message.defaultTemplateSaved'));
    return;
  }

  await saveTemplateSlot(context, target.slot, { ...config, preset: `template-${target.slot}` });
  logger.info(`Saved current template slot. slot=${target.slot}`);
  await vscode.window.showInformationMessage(t('message.templateSlotSaved', { slot: target.slot }));
}
