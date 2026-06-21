import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { createStatusBarEntry } from './ui/statusBar';
import { createLogger } from './utils/logger';

export function activate(context: vscode.ExtensionContext): void {
  const logger = createLogger();
  context.subscriptions.push(logger);
  registerCommands(context, logger);
  context.subscriptions.push(createStatusBarEntry());
  logger.info('UnicodeArtJs extension activated.');
}

export function deactivate(): void {
  // Reserved for future disposable resources.
}
