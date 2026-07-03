import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { loadTemplateSlot, saveRecentConfig } from '../config/presetStore';
import type { ExtensionArtConfig } from '../config/types';
import { createCoreAdapter } from '../core/coreAdapter';
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
      `UnicodeArtJs Template ${slot} is not configured yet.`,
      'Open Converter'
    );
    if (action === 'Open Converter') {
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
    await vscode.window.showInformationMessage('Please select text before generating Unicode art.');
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
        title: 'UnicodeArtJs: generating text art',
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
    await vscode.window.showErrorMessage(`UnicodeArtJs conversion failed: ${getErrorMessage(error)}`);
  }
}

export async function convertSelectionWithOptions(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    await vscode.window.showInformationMessage('Please select text before generating Unicode art.');
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
        title: 'UnicodeArtJs: generating text art',
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
    await vscode.window.showErrorMessage(`UnicodeArtJs conversion failed: ${getErrorMessage(error)}`);
  }
}

async function pickInsertMode(current: InsertMode): Promise<InsertMode | undefined> {
  const modes: Array<{ label: string; mode: InsertMode; description: string }> = [
    { label: 'Replace Selection', mode: 'replaceSelection', description: 'Replace the selected text.' },
    { label: 'Before Selection', mode: 'beforeSelection', description: 'Insert before the selected text.' },
    { label: 'After Selection', mode: 'afterSelection', description: 'Insert after the selected text.' },
    { label: 'Previous Line', mode: 'previousLine', description: 'Insert above the selected line.' },
    { label: 'Next Line', mode: 'nextLine', description: 'Insert below the selected line.' },
    { label: 'New Document', mode: 'newDocument', description: 'Open the result in a new document.' },
    { label: 'Clipboard Only', mode: 'clipboardOnly', description: 'Copy the result to clipboard.' },
  ];

  const picked = await vscode.window.showQuickPick(
    modes.map((item) => ({
      label: item.label,
      description: item.mode === current ? `${item.description} Current` : item.description,
      mode: item.mode,
    })),
    { title: 'UnicodeArtJs Insert Mode' }
  );

  return picked?.mode;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
