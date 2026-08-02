/**
 * Mediates every side effect requested by the Converter WebView.
 *
 * @lang zh-CN 本模块在不可信 WebView 与配置、原生图片解码、临时文件、剪贴板、编辑器和保存对话框之间实施协议、Workspace Trust 与宿主 API 门禁。
 * @lang en This module enforces protocol, Workspace Trust, and host-API gates between the untrusted WebView and configuration, native image decoding, temporary files, clipboard, editor, and save-dialog side effects.
 */
import * as vscode from 'vscode';
import { mergeExtensionConfig } from '../config/configMerge';
import { resolveArtConfig } from '../config/configResolver';
import {
  getTemplateSlotSummaries,
  loadDefaultTemplate,
  saveDefaultTemplate,
  saveRecentConfig,
  saveTemplateSlot,
} from '../config/presetStore';
import { GLYPH_FONT_OPTIONS, VISUAL_FONT_OPTIONS } from '../config/fontOptions';
import type { ExtensionArtConfig } from '../config/types';
import { createCoreAdapter } from '../core/coreAdapter';
import { getWebviewMessages, t } from '../i18n';
import { writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';
import {
  isWebviewMessage,
  type ExtensionMessage,
  type InitialWebviewState,
  type SaveFormat,
  type WebviewMessage,
} from './protocol';

const CHARSETS = ['ASCII', 'EXTENDED', 'CHINESE_SIMPLE', 'CUSTOM'];
const BOX_STYLES = ['single', 'double', 'round', 'bold', 'classic', 'ascii', 'singleDouble', 'doubleSingle', 'arrow', 'block', 'thick', 'none'];
const INSERT_MODES = ['replaceSelection', 'beforeSelection', 'afterSelection', 'previousLine', 'nextLine', 'newDocument', 'clipboardOnly'] as const;
const OUTPUT_TARGETS: ExtensionArtConfig['outputTarget'][] = ['vscode'];
const LOCALES: ExtensionArtConfig['locale'][] = ['zh-CN', 'en-US'];
const canceledRequests = new WeakMap<vscode.WebviewPanel, Set<string>>();

/**
 * Handles one unknown message from the Converter WebView.
 *
 * @param panel - Host-owned <lang><zh-CN>Converter WebView 面板</zh-CN><en>Converter WebView panel</en></lang>.
 * @param message - Unknown <lang><zh-CN>WebView 输入</zh-CN><en>WebView input</en></lang>.
 * @param context - Host-owned <lang><zh-CN>VS Code 扩展上下文</zh-CN><en>VS Code extension context</en></lang>.
 * @param logger - Local <lang><zh-CN>扩展输出日志器</zh-CN><en>extension output logger</en></lang>; portable evidence must not capture its body.
 * @returns <lang><zh-CN>消息被拒绝或对应宿主动作完成后兑现的 Promise。</zh-CN><en>Promise fulfilled after rejection or completion of the corresponding host action.</en></lang>
 * @lang zh-CN 入口先执行完整协议校验，再按消息类型分派；WebView 不能直接指定本机路径、任意配置或编辑器写入 API。
 * @lang en The entry performs complete protocol validation before dispatch; the WebView cannot directly specify local paths, arbitrary configuration, or editor-write APIs.
 */
export async function handleWebviewMessage(
  panel: vscode.WebviewPanel,
  message: unknown,
  context: vscode.ExtensionContext,
  logger: ExtensionLogger
): Promise<void> {
  if (!isWebviewMessage(message)) {
    logger.warn('Rejected unknown WebView message.');
    await postError(panel, t('message.unsupportedMessage'), 'unknownMessage');
    return;
  }

  switch (message.type) {
    case 'ready':
      await post(panel, {
        type: 'readyAck',
        payload: {
          config: resolveArtConfig(context),
          templates: getTemplateState(context),
          i18n: getWebviewMessages(),
          options: {
            charsets: CHARSETS,
            boxStyles: BOX_STYLES,
            insertModes: [...INSERT_MODES],
            visualFonts: VISUAL_FONT_OPTIONS,
            glyphFonts: GLYPH_FONT_OPTIONS,
            outputTargets: OUTPUT_TARGETS,
            locales: LOCALES,
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
          await post(panel, { type: 'notice', payload: { message: t('message.conversionCanceled') } });
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
        await postError(panel, t('message.textConversionFailed', { message: getErrorMessage(error) }), 'convertTextFailed');
      }
      break;
    }
    case 'convertImage': {
      // <lang><zh-CN>WebView 图片会进入原生解码和临时文件生命周期，因此 Restricted Mode 在任何字节写入前拒绝该能力。</zh-CN><en>WebView images enter native decoding and a temporary-file lifecycle, so Restricted Mode rejects this capability before any byte is written.</en></lang>
      if (!vscode.workspace.isTrusted) {
        logger.warn('WebView image conversion rejected: workspace is not trusted.');
        await postError(panel, t('message.workspaceTrustRequiredForImages'), 'workspaceTrustRequired');
        return;
      }

      let tempUri: vscode.Uri | undefined;
      try {
        const requestId = message.payload.requestId;
        const config = mergeExtensionConfig(resolveArtConfig(context), message.payload.config);
        logger.info(
          `WebView image conversion requested. type=${message.payload.mimeType}, ` +
          `size=${message.payload.fileSize}, preset=${config.preset}`
        );
        await post(panel, { type: 'progress', payload: { stage: 'loadImage', progress: 0.15 } });

        // <lang><zh-CN>data URL 只落到扩展 globalStorage 的随机临时文件；Core 返回或抛错后 finally 都会删除该副本。</zh-CN><en>The data URL lands only in a randomized file under extension globalStorage; finally deletes the copy whether Core returns or throws.</en></lang>
        tempUri = await writeTempImage(context, message.payload.imageData, message.payload.fileName);
        await post(panel, { type: 'progress', payload: { stage: 'convertImage', progress: 0.35 } });

        const result = await createCoreAdapter().convertImage(tempUri.fsPath, config);
        if (consumeCanceledRequest(panel, requestId)) {
          logger.info(`WebView image conversion canceled. requestId=${requestId}`);
          await post(panel, { type: 'notice', payload: { message: t('message.conversionCanceled') } });
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
        await postError(panel, t('message.imageConversionFailed', { message: getErrorMessage(error) }), 'convertImageFailed');
      } finally {
        if (tempUri) {
          await vscode.workspace.fs.delete(tempUri, { useTrash: false }).then(undefined, () => undefined);
        }
      }
      break;
    }
    case 'cancel':
      // <lang><zh-CN>取消是协作式的：已进入 Core 的同步转换不强制中断，只在返回后丢弃匹配 requestId 的过期结果。</zh-CN><en>Cancellation is cooperative: synchronous Core work is not forcefully interrupted; its stale result is discarded after return by matching requestId.</en></lang>
      markRequestCanceled(panel, message.payload.requestId);
      logger.info(`WebView conversion cancel requested. requestId=${message.payload.requestId}`);
      await post(panel, { type: 'notice', payload: { message: t('message.cancelingConversion') } });
      break;
    case 'savePreset':
      await savePresetTarget(context, message.payload);
      logger.info(
        `WebView preset saved. target=${message.payload.target ?? 'recent'}, preset=${message.payload.config.preset}`
      );
      await post(panel, { type: 'templateState', payload: getTemplateState(context) });
      await post(panel, { type: 'notice', payload: { message: getPresetSavedMessage(message.payload) } });
      break;
    case 'copy':
      logger.info(`WebView copy requested. chars=${message.payload.content.length}`);
      await vscode.env.clipboard.writeText(message.payload.content);
      await post(panel, { type: 'notice', payload: { message: t('message.copied') } });
      break;
    case 'insert': {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        logger.warn('WebView insert rejected: no active editor.');
        await postError(panel, t('message.noActiveEditor'), 'noActiveEditor');
        return;
      }
      logger.info(`WebView insert requested. mode=${message.payload.mode}, chars=${message.payload.content.length}`);
      // <lang><zh-CN>WebView 不直接修改文档；插入继续通过与命令入口共用的 writeResult 写入边界。</zh-CN><en>The WebView never edits a document directly; insertion continues through the shared writeResult boundary used by commands.</en></lang>
      await writeResult(editor, message.payload.content, message.payload.mode);
      await post(panel, { type: 'notice', payload: { message: t('message.inserted') } });
      break;
    }
    case 'save':
      logger.info(`WebView save requested. format=${message.payload.format}, chars=${message.payload.content.length}`);
      // <lang><zh-CN>保存路径只能来自 VS Code showSaveDialog；协议没有供 WebView 指定任意本机路径的字段。</zh-CN><en>The save path can come only from VS Code showSaveDialog; the protocol exposes no field for an arbitrary local path.</en></lang>
      if (await saveContent(message.payload.content, message.payload.format, message.payload.glyphFont)) {
        logger.info(`WebView save completed. format=${message.payload.format}`);
        await post(panel, { type: 'notice', payload: { message: t('message.savedFile') } });
      } else {
        logger.info(`WebView save canceled. format=${message.payload.format}`);
        await post(panel, { type: 'notice', payload: { message: t('message.saveCanceled') } });
      }
      break;
    default:
      await postError(panel, t('message.unsupportedMessage'), 'unsupportedMessage');
  }
}

function getTemplateState(context: vscode.ExtensionContext): InitialWebviewState['templates'] {
  return {
    defaultConfigured: Boolean(loadDefaultTemplate(context)),
    slots: getTemplateSlotSummaries(context).map((item) => ({
      ...item,
      label: t('quickPick.templateSlot', { slot: item.slot }),
    })),
  };
}

async function savePresetTarget(
  context: vscode.ExtensionContext,
  payload: Extract<WebviewMessage, { type: 'savePreset' }>['payload']
): Promise<void> {
  if (payload.target === 'default') {
    await saveDefaultTemplate(context, payload.config);
    return;
  }

  if (payload.target === 'slot') {
    await saveTemplateSlot(context, payload.slot ?? 1, payload.config);
    return;
  }

  await saveRecentConfig(context, payload.config);
}

function getPresetSavedMessage(
  payload: Extract<WebviewMessage, { type: 'savePreset' }>['payload']
): string {
  if (payload.target === 'default') return t('message.savedDefaultTemplate');
  if (payload.target === 'slot') return t('message.savedTemplateSlot', { slot: payload.slot ?? 1 });
  return t('message.savedRecentPreset', { preset: payload.config.preset });
}

async function post(panel: vscode.WebviewPanel, message: ExtensionMessage): Promise<void> {
  await panel.webview.postMessage(message);
}

async function postError(panel: vscode.WebviewPanel, message: string, code?: string): Promise<void> {
  await post(panel, { type: 'error', payload: { message, code } });
}

async function saveContent(content: string, format: SaveFormat, glyphFont?: string): Promise<boolean> {
  const defaultName = format === 'html' ? 'unicode-art.html' : 'unicode-art.txt';
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultName),
    filters: format === 'html'
      ? { HTML: ['html'] }
      : { Text: ['txt'] },
  });
  if (!uri) return false;

  const body = format === 'html'
    ? toHtmlDocument(content, glyphFont)
    : content;
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(body));
  return true;
}

function toHtmlDocument(content: string, glyphFont?: string): string {
  const safeGlyphFont = sanitizeCssFontFamily(glyphFont || "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UnicodeArtJs Output</title>
  <style>
    body {
      margin: 16px;
      background: #ffffff;
      color: #111111;
    }

    pre {
      margin: 0;
      overflow: auto;
      font-family: ${safeGlyphFont};
      font-size: 14px;
      line-height: 1;
      tab-size: 2;
      white-space: pre;
    }
  </style>
</head>
<body>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

function sanitizeCssFontFamily(value: string): string {
  // 只保留字体族列表常见字符，避免把 WebView 输入直接写成任意 CSS。
  const cleaned = value.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s'",._#-]/g, '').trim();
  return cleaned.length > 0 ? cleaned : "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace";
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
  if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(fromName)) {
    return fromName;
  }

  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/bmp':
      return 'bmp';
    case 'image/png':
    default:
      return 'png';
  }
}
