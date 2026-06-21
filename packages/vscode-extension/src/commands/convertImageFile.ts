import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveRecentConfig } from '../config/presetStore';
import { createCoreAdapter } from '../core/coreAdapter';
import { writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';

const IMAGE_FILTERS = {
  Images: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'],
};

export async function convertImageFile(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger,
  resource?: vscode.Uri
): Promise<void> {
  const imageUri = resource ?? await pickImageFile();
  if (!imageUri) return;

  const config = resolveArtConfig(context);
  logger.info(`Image conversion requested. path=${imageUri.fsPath}, preset=${config.preset}`);

  if (imageUri.scheme !== 'file') {
    await vscode.window.showErrorMessage('UnicodeArtJs can only convert local image files in this phase.');
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'UnicodeArtJs: converting image',
        cancellable: false,
      },
      async () => {
        const result = await createCoreAdapter().convertImage(imageUri.fsPath, config);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await writeResult(editor, result.content, config.insertMode);
        } else {
          await openNewDocument(result.content);
        }
        await saveRecentConfig(context, config);
        logger.info(`Image conversion completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      }
    );
  } catch (error) {
    logger.error('Image conversion failed.', error);
    await vscode.window.showErrorMessage(`UnicodeArtJs image conversion failed: ${getErrorMessage(error)}`);
  }
}

async function pickImageFile(): Promise<vscode.Uri | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: IMAGE_FILTERS,
    title: 'Select an image to convert to Unicode art',
  });
  return picked?.[0];
}

async function openNewDocument(content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content,
  });
  await vscode.window.showTextDocument(document);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
