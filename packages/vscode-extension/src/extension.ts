import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { createStatusBarEntry } from './ui/statusBar';
import { createLogger } from './utils/logger';

/**
 * 🟢 激活 UnicodeArtJs VS Code 扩展
 *
 * 🔹 注册命令、状态栏入口和输出日志通道。
 * 🔹 VS Code 只在声明的命令触发时加载扩展，因此这里保持轻量同步初始化。
 *
 * @param context - VS Code 提供的扩展上下文。
 */
export function activate(context: vscode.ExtensionContext): void {
  const logger = createLogger();
  context.subscriptions.push(logger);
  registerCommands(context, logger);
  context.subscriptions.push(createStatusBarEntry());
  logger.info('UnicodeArtJs extension activated.');
}

/**
 * 🟢 停用扩展
 *
 * 🔹 当前没有额外异步资源需要释放；一次性资源已通过 `context.subscriptions` 托管。
 */
export function deactivate(): void {
  // Reserved for future disposable resources.
}
