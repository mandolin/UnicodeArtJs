import * as vscode from 'vscode';

export type InsertMode =
  | 'replaceSelection'
  | 'beforeSelection'
  | 'afterSelection'
  | 'previousLine'
  | 'nextLine'
  | 'newDocument'
  | 'clipboardOnly';

export async function writeResult(
  editor: vscode.TextEditor,
  content: string,
  mode: InsertMode
): Promise<void> {
  switch (mode) {
    case 'replaceSelection':
      await editor.edit((edit) => edit.replace(editor.selection, content));
      break;
    case 'beforeSelection':
      await editor.edit((edit) => edit.insert(editor.selection.start, content));
      break;
    case 'afterSelection':
      await editor.edit((edit) => edit.insert(editor.selection.end, content));
      break;
    case 'previousLine':
      await insertAtLine(editor, Math.max(0, editor.selection.start.line), `${content}\n`);
      break;
    case 'nextLine':
      await insertAtLine(editor, editor.selection.end.line + 1, `${content}\n`);
      break;
    case 'newDocument':
      await openNewDocument(content);
      break;
    case 'clipboardOnly':
      await vscode.env.clipboard.writeText(content);
      await vscode.window.showInformationMessage('UnicodeArtJs result copied to clipboard.');
      break;
    default:
      await assertNever(mode);
  }
}

async function insertAtLine(editor: vscode.TextEditor, line: number, content: string): Promise<void> {
  const targetLine = Math.min(line, editor.document.lineCount);
  const position = targetLine >= editor.document.lineCount
    ? editor.document.lineAt(editor.document.lineCount - 1).range.end
    : new vscode.Position(targetLine, 0);
  await editor.edit((edit) => edit.insert(position, content));
}

async function openNewDocument(content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content,
  });
  await vscode.window.showTextDocument(document);
}

async function assertNever(value: never): Promise<void> {
  throw new Error(`Unsupported insert mode: ${String(value)}`);
}
