import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { loadTemplateSlot, saveRecentConfig } from '../config/presetStore';
import type { ExtensionArtConfig } from '../config/types';
import { createCoreAdapter } from '../core/coreAdapter';
import { t } from '../i18n';
import { InsertMode, writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';

export async function convertSelection(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  await convertSelectedText(context, logger, resolveArtConfig(context), 'selection');
}

export async function generateWithDefaultTemplate(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const config = resolveArtConfig(context, { includeRecent: false });
  await convertSelectedText(context, logger, config, 'default template', false);
}

export async function generateWithTemplateSlot(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger,
  slot: number
): Promise<void> {
  const config = loadTemplateSlot(context, slot);
  if (!config) {
    const action = await vscode.window.showInformationMessage(
      t('message.templateNotConfigured', { slot }),
      t('message.openConverter')
    );
    if (action === t('message.openConverter')) {
      await vscode.commands.executeCommand('unicodeArtJs.openConverter');
    }
    return;
  }

  await convertSelectedText(context, logger, config, `template ${slot}`);
}

async function convertSelectedText(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger,
  config: ExtensionArtConfig,
  flowLabel: string,
  saveRecent = true
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    await vscode.window.showInformationMessage(t('message.selectText'));
    return;
  }

  const selectedText = editor.document.getText(editor.selection);
  logger.info(
    `Selection conversion requested. flow=${flowLabel}, chars=${selectedText.length}, preset=${config.preset}`
  );

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('message.generatingTextArt'),
        cancellable: false,
      },
      async () => {
        const result = await createCoreAdapter().convertText(selectedText, config);
        await writeResult(editor, result.content, config.insertMode);
        if (saveRecent) {
          await saveRecentConfig(context, config);
        }
        logger.info(`Selection conversion completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      }
    );
  } catch (error) {
    logger.error('Selection conversion failed.', error);
    await vscode.window.showErrorMessage(t('message.conversionFailed', { message: getErrorMessage(error) }));
  }
}

export async function convertSelectionWithOptions(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    await vscode.window.showInformationMessage(t('message.selectText'));
    return;
  }

  const config = resolveArtConfig(context);
  const insertMode = await pickInsertMode(config.insertMode);
  if (!insertMode) return;

  logger.info(`Selection conversion with options requested. insertMode=${insertMode}`);
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('message.generatingTextArt'),
        cancellable: false,
      },
      async () => {
        const result = await createCoreAdapter().convertText(editor.document.getText(editor.selection), config);
        await writeResult(editor, result.content, insertMode);
        await saveRecentConfig(context, { ...config, insertMode });
        logger.info(`Selection conversion with options completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      }
    );
  } catch (error) {
    logger.error('Selection conversion with options failed.', error);
    await vscode.window.showErrorMessage(t('message.conversionFailed', { message: getErrorMessage(error) }));
  }
}

async function pickInsertMode(current: InsertMode): Promise<InsertMode | undefined> {
  const modes: Array<{ label: string; mode: InsertMode; description: string }> = [
    { label: t('insert.replaceSelection'), mode: 'replaceSelection', description: t('insert.replaceSelectionDesc') },
    { label: t('insert.beforeSelection'), mode: 'beforeSelection', description: t('insert.beforeSelectionDesc') },
    { label: t('insert.afterSelection'), mode: 'afterSelection', description: t('insert.afterSelectionDesc') },
    { label: t('insert.previousLine'), mode: 'previousLine', description: t('insert.previousLineDesc') },
    { label: t('insert.nextLine'), mode: 'nextLine', description: t('insert.nextLineDesc') },
    { label: t('insert.newDocument'), mode: 'newDocument', description: t('insert.newDocumentDesc') },
    { label: t('insert.clipboardOnly'), mode: 'clipboardOnly', description: t('insert.clipboardOnlyDesc') },
  ];

  const picked = await vscode.window.showQuickPick(
    modes.map((item) => ({
      label: item.label,
      description: item.mode === current ? `${item.description} ${t('insert.current')}` : item.description,
      mode: item.mode,
    })),
    { title: t('insert.title') }
  );

  return picked?.mode;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
