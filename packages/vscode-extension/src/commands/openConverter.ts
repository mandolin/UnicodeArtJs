import * as vscode from 'vscode';
import { createConverterPanel } from '../webview/panel';
import type { ExtensionLogger } from '../utils/logger';

let currentPanel: vscode.WebviewPanel | undefined;

export function openConverter(context: vscode.ExtensionContext, logger: ExtensionLogger): void {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    logger.info('Revealed existing converter panel.');
    return;
  }

  currentPanel = createConverterPanel(context, logger);
  logger.info('Opened converter panel.');
  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}
