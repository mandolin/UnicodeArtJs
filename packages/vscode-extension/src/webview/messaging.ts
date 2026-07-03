import * as vscode from 'vscode';
import { mergeExtensionConfig } from '../config/configMerge';
import { resolveArtConfig } from '../config/configResolver';
import { saveRecentConfig } from '../config/presetStore';
import type { ExtensionArtConfig } from '../config/types';
import { createCoreAdapter } from '../core/coreAdapter';
import { writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';
import { isWebviewMessage, type ExtensionMessage, type SaveFormat } from './protocol';

const CHARSETS = ['ASCII', 'EXTENDED', 'CHINESE_SIMPLE', 'CUSTOM'];
const BOX_STYLES = ['single', 'double', 'round', 'bold', 'classic', 'ascii', 'singleDouble', 'doubleSingle', 'arrow', 'block', 'thick', 'none'];
const INSERT_MODES = ['replaceSelection', 'beforeSelection', 'afterSelection', 'previousLine', 'nextLine', 'newDocument', 'clipboardOnly'] as const;
const GLYPH_FONTS = [
  "Consolas, 'Courier New', monospace",
  'NSimSun, 新宋体, monospace',
  "'Sarasa Mono SC', 等距更纱黑体 SC, monospace",
  "'LXGW WenKai Mono', 霞鹜文楷等宽, monospace",
  "Menlo, Monaco, 'Courier New', monospace"
];
const canceledRequests = new WeakMap<vscode.WebviewPanel, Set<string>>();

export async function handleWebviewMessage(
  panel: vscode.WebviewPanel,
  message: unknown,
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  if (!isWebviewMessage(message)) {
    logger.warn('Rejected unknown WebView message.');
    await postError(panel, 'Unsupported WebView message.', 'unknownMessage');
    return;
  }

  switch (message.type) {
    case 'ready':
      await post(panel, {
        type: 'readyAck',
        payload: {
          config: resolveArtConfig(context),
          options: {
            charsets: CHARSETS,
            boxStyles: BOX_STYLES,
            insertModes: [...INSERT_MODES],
            glyphFonts: GLYPH_FONTS,
          },
        },
      });
      break;
    case 'convertText': {
      try {
        const requestId = message.payload.requestId;
        const config = mergeExtensionConfig(resolveArtConfig(context), message.payload.config);
        logger.info(`WebView text conversion requested. chars=${message.payload.text.length}, preset=${config.preset}`);
        await post(panel, { type: 'progress', payload: { stage: 'convertText', progress: 0.15 } });

        const result = await createCoreAdapter().convertText(message.payload.text, config);
        if (consumeCanceledRequest(panel, requestId)) {
          logger.info(`WebView text conversion canceled. requestId=${requestId}`);
          await post(panel, { type: 'notice', payload: { message: 'Conversion canceled.' } });
          return;
        }

        await post(panel, { type: 'progress', payload: { stage: 'renderPreview', progress: 0.9 } });
        await post(panel, {
          type: 'result',
          payload: {
            content: result.content,
            rows: result.rows,
            cols: result.cols,
            source: 'text',
          },
        });
        await post(panel, { type: 'progress', payload: { stage: 'done', progress: 1 } });
        await saveRecentConfig(context, config);
        logger.info(`WebView text conversion completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      } catch (error) {
        logger.error('WebView text conversion failed.', error);
        await postError(panel, `Text conversion failed: ${getErrorMessage(error)}`, 'convertTextFailed');
      }
      break;
    }
    case 'convertImage': {
      if (!message.payload.imageData) {
        await postError(panel, 'Please choose an image file before converting.', 'missingImage');
        return;
      }

      let tempUri: vscode.Uri | undefined;
      try {
        const requestId = message.payload.requestId;
        const config = mergeExtensionConfig(resolveArtConfig(context), message.payload.config);
        logger.info(`WebView image conversion requested. file=${message.payload.fileName ?? 'unnamed'}, preset=${config.preset}`);
        await post(panel, { type: 'progress', payload: { stage: 'loadImage', progress: 0.15 } });

        tempUri = await writeTempImage(context, message.payload.imageData, message.payload.fileName);
        await post(panel, { type: 'progress', payload: { stage: 'convertImage', progress: 0.35 } });

        const result = await createCoreAdapter().convertImage(tempUri.fsPath, config);
        if (consumeCanceledRequest(panel, requestId)) {
          logger.info(`WebView image conversion canceled. requestId=${requestId}`);
          await post(panel, { type: 'notice', payload: { message: 'Conversion canceled.' } });
          return;
        }

        await post(panel, { type: 'progress', payload: { stage: 'renderPreview', progress: 0.9 } });
        await post(panel, {
          type: 'result',
          payload: {
            content: result.content,
            rows: result.rows,
            cols: result.cols,
            source: 'image',
          },
        });
        await post(panel, { type: 'progress', payload: { stage: 'done', progress: 1 } });
        await saveRecentConfig(context, config);
        logger.info(`WebView image conversion completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      } catch (error) {
        logger.error('WebView image conversion failed.', error);
        await postError(panel, `Image conversion failed: ${getErrorMessage(error)}`, 'convertImageFailed');
      } finally {
        if (tempUri) {
          await vscode.workspace.fs.delete(tempUri, { useTrash: false }).then(undefined, () => undefined);
        }
      }
      break;
    }
    case 'cancel':
      markRequestCanceled(panel, message.payload.requestId);
      logger.info(`WebView conversion cancel requested. requestId=${message.payload.requestId}`);
      await post(panel, { type: 'notice', payload: { message: 'Canceling conversion...' } });
      break;
    case 'savePreset':
      await saveRecentConfig(context, message.payload.config);
      logger.info(`WebView preset saved. preset=${message.payload.config.preset}`);
      await post(panel, { type: 'notice', payload: { message: `Saved preset: ${message.payload.config.preset}` } });
      break;
    case 'copy':
      await vscode.env.clipboard.writeText(message.payload.content);
      await post(panel, { type: 'notice', payload: { message: 'Copied to clipboard.' } });
      break;
    case 'insert': {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        await postError(panel, 'No active editor is available.', 'noActiveEditor');
        return;
      }
      await writeResult(editor, message.payload.content, message.payload.mode);
      await post(panel, { type: 'notice', payload: { message: 'Inserted into editor.' } });
      break;
    }
    case 'save':
      await saveContent(message.payload.content, message.payload.format, message.payload.glyphFont);
      await post(panel, { type: 'notice', payload: { message: 'Saved file.' } });
      break;
    default:
      await postError(panel, 'Unsupported WebView message.', 'unsupportedMessage');
  }
}

async function post(panel: vscode.WebviewPanel, message: ExtensionMessage): Promise<void> {
  await panel.webview.postMessage(message);
}

async function postError(panel: vscode.WebviewPanel, message: string, code?: string): Promise<void> {
  await post(panel, { type: 'error', payload: { message, code } });
}

async function saveContent(content: string, format: SaveFormat, glyphFont?: string): Promise<void> {
  const defaultName = format === 'html' ? 'unicode-art.html' : 'unicode-art.txt';
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultName),
    filters: format === 'html'
      ? { HTML: ['html'] }
      : { Text: ['txt'] },
  });
  if (!uri) return;

  const body = format === 'html'
    ? toHtmlDocument(content, glyphFont)
    : content;
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(body));
}

function toHtmlDocument(content: string, glyphFont?: string): string {
  const safeGlyphFont = sanitizeCssFontFamily(glyphFont || "Consolas, 'Courier New', monospace");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>UnicodeArtJs Output</title>
  <style>pre { white-space: pre; font-family: ${safeGlyphFont}; }</style>
</head>
<body>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

function sanitizeCssFontFamily(value: string): string {
  // 只保留字体族列表常见字符，避免把 WebView 输入直接写成任意 CSS。
  const cleaned = value.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s'",._#-]/g, '').trim();
  return cleaned.length > 0 ? cleaned : "Consolas, 'Courier New', monospace";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function markRequestCanceled(panel: vscode.WebviewPanel, requestId: string): void {
  const existing = canceledRequests.get(panel) ?? new Set<string>();
  existing.add(requestId);
  canceledRequests.set(panel, existing);
}

function consumeCanceledRequest(panel: vscode.WebviewPanel, requestId: string | undefined): boolean {
  if (!requestId) return false;
  const existing = canceledRequests.get(panel);
  if (!existing?.has(requestId)) return false;
  existing.delete(requestId);
  return true;
}

async function writeTempImage(
  context: vscode.ExtensionContext,
  dataUrl: string,
  fileName: string | undefined
): Promise<vscode.Uri> {
  const parsed = parseDataUrl(dataUrl);
  const dir = vscode.Uri.joinPath(context.globalStorageUri, 'webview-images');
  await vscode.workspace.fs.createDirectory(dir);

  const extension = getImageExtension(fileName, parsed.mimeType);
  const uri = vscode.Uri.joinPath(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await vscode.workspace.fs.writeFile(uri, Uint8Array.from(Buffer.from(parsed.base64, 'base64')));
  return uri;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }
  return { mimeType: match[1], base64: match[2] };
}

function getImageExtension(fileName: string | undefined, mimeType: string): string {
  const fromName = fileName?.match(/\.([a-z0-9]+)$/iu)?.[1]?.toLowerCase();
  if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(fromName)) {
    return fromName;
  }

  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'image/png':
    default:
      return 'png';
  }
}
