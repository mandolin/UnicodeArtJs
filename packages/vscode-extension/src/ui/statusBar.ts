import * as vscode from 'vscode';

export function createStatusBarEntry(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'unicodeArtJs.openConverter';
  item.text = '$(symbol-misc) UnicodeArtJs';
  item.tooltip = 'Open UnicodeArtJs Converter';
  item.show();
  return item;
}
