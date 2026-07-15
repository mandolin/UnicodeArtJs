import * as vscode from 'vscode';
import { getConverterHtml } from './html';
import { handleWebviewMessage } from './messaging';
import type { ExtensionLogger } from '../utils/logger';

/**
 * 🟢 创建 Converter WebView 面板
 *
 * 🔹 限制本地资源根目录为扩展 `media` 目录，并把所有 WebView 消息交给协议处理器。
 *
 * @param context - VS Code 扩展上下文。
 * @param logger - 扩展输出日志器。
 * @returns Converter WebView 面板。
 */
export function createConverterPanel(context: vscode.ExtensionContext, logger: ExtensionLogger): vscode.WebviewPanel {
  logger.info('Opening Converter WebView.');
  const panel = vscode.window.createWebviewPanel(
    'unicodeArtJsConverter',
    'UnicodeArtJs Converter',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media'),
      ],
    }
  );

  panel.webview.html = getConverterHtml(panel.webview, context.extensionUri);
  panel.webview.onDidReceiveMessage((message) => handleWebviewMessage(panel, message, context, logger));
  panel.onDidDispose(() => logger.info('Converter WebView disposed.'));

  return panel;
}
