import * as vscode from 'vscode';
import { openConverter } from './openConverter';
import { convertImageFile } from './convertImageFile';
import { convertSelection, convertSelectionWithOptions } from './convertSelection';
import { openSettings } from './openSettings';
import { saveCurrentPreset } from './saveCurrentPreset';
import type { ExtensionLogger } from '../utils/logger';

export function registerCommands(context: vscode.ExtensionContext, logger: ExtensionLogger): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('unicodeArtJs.openConverter', () => openConverter(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.convertSelection', () => convertSelection(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.convertSelectionWithOptions', () => convertSelectionWithOptions(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.convertImageFile', (resource?: vscode.Uri) => convertImageFile(context, logger, resource)),
    vscode.commands.registerCommand('unicodeArtJs.openSettings', () => openSettings()),
    vscode.commands.registerCommand('unicodeArtJs.saveCurrentPreset', () => saveCurrentPreset(context, logger))
  );
}
