import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveRecentConfig } from '../config/presetStore';
import { createCoreAdapter } from '../core/coreAdapter';
import { InsertMode, writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';

export async function convertSelection(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    await vscode.window.showInformationMessage('Please select text before generating Unicode art.');
    return;
  }

  const selectedText = editor.document.getText(editor.selection);
  const config = resolveArtConfig(context);
  logger.info(`Selection conversion requested. chars=${selectedText.length}, preset=${config.preset}`);

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
        await saveRecentConfig(context, config);
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
