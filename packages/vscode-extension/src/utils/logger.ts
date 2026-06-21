import * as vscode from 'vscode';

export interface ExtensionLogger extends vscode.Disposable {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export function createLogger(): ExtensionLogger {
  const channel = vscode.window.createOutputChannel('UnicodeArtJs');
  return {
    info(message: string): void {
      channel.appendLine(`[info] ${message}`);
    },
    warn(message: string): void {
      channel.appendLine(`[warn] ${message}`);
    },
    error(message: string, error?: unknown): void {
      channel.appendLine(`[error] ${message}`);
      if (error instanceof Error) {
        channel.appendLine(error.stack ?? error.message);
      } else if (error !== undefined) {
        channel.appendLine(String(error));
      }
    },
    dispose(): void {
      channel.dispose();
    },
  };
}
