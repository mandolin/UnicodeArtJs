/**
 * Converts an explicitly selected local image through the trusted extension host.
 *
 * @lang zh-CN 本模块拥有图片文件选择、Workspace Trust 门禁、Core 调用与编辑器写入边界；不接受远程 URI，也不在受限模式处理图片字节。
 * @lang en This module owns image selection, the Workspace Trust gate, Core invocation, and editor-write boundary; it accepts no remote URI and processes no image bytes in Restricted Mode.
 */
import * as vscode from 'vscode';
import { resolveArtConfig } from '../config/configResolver';
import { saveRecentConfig } from '../config/presetStore';
import { createCoreAdapter } from '../core/coreAdapter';
import { t } from '../i18n';
import { writeResult } from '../output/resultWriter';
import type { ExtensionLogger } from '../utils/logger';

const IMAGE_FILTERS = {
  Images: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
};

/**
 * Converts one trusted local image file to Unicode art.
 *
 * @param context - Host-owned <lang><zh-CN>VS Code 扩展上下文</zh-CN><en>VS Code extension context</en></lang>.
 * @param logger - Local <lang><zh-CN>扩展输出日志器</zh-CN><en>extension output logger</en></lang>; portable evidence must not capture its body.
 * @param resource - Optional <lang><zh-CN>由 Explorer 提供的图片资源 URI</zh-CN><en>image resource URI supplied by Explorer</en></lang>.
 * @returns <lang><zh-CN>转换、写入或用户取消完成后兑现的 Promise。</zh-CN><en>Promise fulfilled after conversion, writing, or user cancellation completes.</en></lang>
 * @lang zh-CN 入口只接受可信工作区中的本地 file URI；结果通过共享 writeResult 边界写入，且没有编辑器时只创建未保存文档。
 * @lang en The entry accepts only local file URIs in trusted workspaces; results pass through the shared writeResult boundary, and without an editor it creates only an unsaved document.
 */
export async function convertImageFile(
  context: vscode.ExtensionContext,
  logger: ExtensionLogger,
  resource?: vscode.Uri
): Promise<void> {
  // <lang><zh-CN>图片解码会把工作区或用户选择的文件交给原生依赖，因此 Restricted Mode 必须在文件选择与读取之前终止。</zh-CN><en>Image decoding hands a workspace or user-selected file to native dependencies, so Restricted Mode must stop before file selection or reading.</en></lang>
  if (!vscode.workspace.isTrusted) {
    await vscode.window.showErrorMessage(t('message.workspaceTrustRequiredForImages'));
    return;
  }

  // <lang><zh-CN>Explorer 资源优先；没有资源时由 VS Code 文件对话框产生用户明确选择。</zh-CN><en>Prefer the Explorer resource; without one, the VS Code file dialog produces an explicit user selection.</en></lang>
  const imageUri = resource ?? await pickImageFile();
  if (!imageUri) return;

  // <lang><zh-CN>配置由宿主解析，日志只记录来源类别和 preset，不记录可识别本机路径。</zh-CN><en>The host resolves configuration, and the log records only source category and preset, never an identifying local path.</en></lang>
  const config = resolveArtConfig(context);
  logger.info(`Image conversion requested. source=local-file, preset=${config.preset}`);

  if (imageUri.scheme !== 'file') {
    await vscode.window.showErrorMessage(t('message.localImageOnly'));
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'UnicodeArtJs: converting image',
        cancellable: false,
      },
      async () => {
        const result = await createCoreAdapter().convertImage(imageUri.fsPath, config);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          // <lang><zh-CN>集中写入边界确保图片转换不会自行构造 WorkspaceEdit 或写工作区文件。</zh-CN><en>The centralized write boundary ensures image conversion does not construct its own WorkspaceEdit or write workspace files.</en></lang>
          await writeResult(editor, result.content, config.insertMode);
        } else {
          await openNewDocument(result.content);
        }
        await saveRecentConfig(context, config);
        logger.info(`Image conversion completed. rows=${result.rows}, cols=${result.cols}, duration=${result.duration}ms`);
      }
    );
  } catch (error) {
    logger.error('Image conversion failed.', error);
    await vscode.window.showErrorMessage(`UnicodeArtJs image conversion failed: ${getErrorMessage(error)}`);
  }
}

async function pickImageFile(): Promise<vscode.Uri | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: IMAGE_FILTERS,
    title: 'Select an image to convert to Unicode art',
  });
  return picked?.[0];
}

async function openNewDocument(content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content,
  });
  await vscode.window.showTextDocument(document);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
