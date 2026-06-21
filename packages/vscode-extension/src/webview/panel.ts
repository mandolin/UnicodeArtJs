import * as vscode from 'vscode';
import { getConverterHtml } from './html';
import { handleWebviewMessage } from './messaging';
import type { ExtensionLogger } from '../utils/logger';

export function createConverterPanel(context: vscode.ExtensionContext, logger: ExtensionLogger): vscode.WebviewPanel {
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

  return panel;
}
