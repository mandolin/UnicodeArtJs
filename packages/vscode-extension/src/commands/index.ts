import * as vscode from 'vscode';
import { openConverter } from './openConverter';
import { convertImageFile } from './convertImageFile';
import {
  convertSelection,
  convertSelectionWithOptions,
  generateWithDefaultTemplate,
  generateWithTemplateSlot,
} from './convertSelection';
import { openSettings } from './openSettings';
import { saveCurrentPreset } from './saveCurrentPreset';
import type { ExtensionLogger } from '../utils/logger';

/**
 * 🟢 注册 UnicodeArtJs VS Code 命令
 *
 * 🔹 将 package.json 中声明的命令绑定到实际处理函数。
 * 🔹 所有 disposable 都加入 `context.subscriptions`，由 VS Code 生命周期统一释放。
 *
 * @param context - VS Code 扩展上下文。
 * @param logger - 扩展输出日志器。
 */
export function registerCommands(context: vscode.ExtensionContext, logger: ExtensionLogger): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('unicodeArtJs.openConverter', () => openConverter(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.convertSelection', () => convertSelection(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.convertSelectionWithOptions', () => convertSelectionWithOptions(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.generateWithDefaultTemplate', () => generateWithDefaultTemplate(context, logger)),
    vscode.commands.registerCommand('unicodeArtJs.generateWithTemplate1', () => generateWithTemplateSlot(context, logger, 1)),
    vscode.commands.registerCommand('unicodeArtJs.generateWithTemplate2', () => generateWithTemplateSlot(context, logger, 2)),
    vscode.commands.registerCommand('unicodeArtJs.generateWithTemplate3', () => generateWithTemplateSlot(context, logger, 3)),
    vscode.commands.registerCommand('unicodeArtJs.convertImageFile', (resource?: vscode.Uri) => convertImageFile(context, logger, resource)),
    vscode.commands.registerCommand('unicodeArtJs.openSettings', () => openSettings()),
    vscode.commands.registerCommand('unicodeArtJs.saveCurrentPreset', () => saveCurrentPreset(context, logger))
  );
}
