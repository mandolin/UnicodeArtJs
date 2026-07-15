import * as vscode from 'vscode';

/**
 * 🟢 创建 UnicodeArtJs 状态栏入口
 *
 * 🔹 点击后打开 Converter 面板。
 *
 * @returns 已显示的状态栏项。
 */
export function createStatusBarEntry(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'unicodeArtJs.openConverter';
  item.text = '$(symbol-misc) UnicodeArtJs';
  item.tooltip = 'Open UnicodeArtJs Converter';
  item.show();
  return item;
}
