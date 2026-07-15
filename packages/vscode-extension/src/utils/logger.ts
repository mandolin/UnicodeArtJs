import * as vscode from 'vscode';

/**
 * 🟢 扩展日志器
 *
 * 🔹 写入 UnicodeArtJs Output Channel，并作为 disposable 纳入扩展生命周期。
 */
export interface ExtensionLogger extends vscode.Disposable {
  /** 记录普通信息。 */
  info(message: string): void;
  /** 记录警告信息。 */
  warn(message: string): void;
  /** 记录错误信息，可附带异常对象。 */
  error(message: string, error?: unknown): void;
}

/**
 * 🟢 创建扩展日志器
 *
 * @returns 可写入 VS Code Output Channel 的日志器。
 */
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
