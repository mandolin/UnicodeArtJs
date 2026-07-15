import type { ExtensionArtConfig } from '../config/types';
import type { InsertMode } from '../output/resultWriter';

/**
 * 🟢 Converter 模板槽展示数据
 */
export interface TemplateSlotView {
  /** 模板槽编号。 */
  slot: number;
  /** 本地化展示标签。 */
  label: string;
  /** 是否已保存配置。 */
  configured: boolean;
  /** 保存配置中的 preset 标识。 */
  preset?: string;
}

/**
 * 🟢 WebView 初始化状态
 *
 * 🔹 宿主在收到 `ready` 消息后发送给 WebView，用于填充控件、语言包和模板状态。
 */
export interface InitialWebviewState {
  /** 当前有效扩展配置。 */
  config: ExtensionArtConfig;
  /** 模板配置状态。 */
  templates: {
    defaultConfigured: boolean;
    slots: TemplateSlotView[];
  };
  /** WebView 可直接使用的本地化消息表。 */
  i18n: Record<string, string>;
  /** WebView 下拉控件的可选项。 */
  options: {
    charsets: string[];
    boxStyles: string[];
    insertModes: InsertMode[];
    visualFonts: string[];
    glyphFonts: string[];
    outputTargets: ExtensionArtConfig['outputTarget'][];
    locales: ExtensionArtConfig['locale'][];
  };
}

/**
 * 🟢 文本转换请求载荷
 */
export interface ConvertTextPayload {
  /** 待转换文本。 */
  text: string;
  /** 本次请求覆盖配置。 */
  config?: Partial<ExtensionArtConfig>;
  /** 用于取消请求和丢弃过期结果的可选 ID。 */
  requestId?: string;
}

/**
 * 🟢 图片转换请求载荷
 */
export interface ConvertImagePayload {
  /** data URL 形式的图片内容。 */
  imageData?: string;
  /** 原始文件名，仅用于日志和临时扩展名判断。 */
  fileName?: string;
  /** 图片大小，单位字节。 */
  fileSize?: number;
  /** 图片 MIME 类型。 */
  mimeType?: string;
  /** 本次请求覆盖配置。 */
  config?: Partial<ExtensionArtConfig>;
  /** 用于取消请求和丢弃过期结果的可选 ID。 */
  requestId?: string;
}

/**
 * 🟢 WebView 保存格式
 */
export type SaveFormat = 'txt' | 'html';
/**
 * 🟢 预设保存目标
 */
export type PresetSaveTarget = 'recent' | 'default' | 'slot';

/**
 * 🟢 WebView 发送到扩展宿主的消息
 *
 * 🔹 所有消息必须先通过 `isWebviewMessage` 校验，宿主不信任任意 WebView 输入。
 */
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'convertText'; payload: ConvertTextPayload }
  | { type: 'convertImage'; payload: ConvertImagePayload }
  | { type: 'cancel'; payload: { requestId: string } }
  | { type: 'savePreset'; payload: { config: ExtensionArtConfig; target?: PresetSaveTarget; slot?: number } }
  | { type: 'copy'; payload: { content: string } }
  | { type: 'insert'; payload: { content: string; mode: InsertMode } }
  | { type: 'save'; payload: { content: string; format: SaveFormat; glyphFont?: string } };

/**
 * 🟢 扩展宿主发送到 WebView 的消息
 */
export type ExtensionMessage =
  | { type: 'readyAck'; payload: InitialWebviewState }
  | { type: 'progress'; payload: { stage: string; progress: number } }
  | { type: 'result'; payload: { content: string; rows: number; cols: number; source: 'text' | 'image' } }
  | { type: 'templateState'; payload: InitialWebviewState['templates'] }
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'notice'; payload: { message: string } };

/**
 * 🟢 校验 WebView 消息
 *
 * 🔹 只校验协议结构和必要字段；配置字段继续由后续合并和 Core 校验处理。
 *
 * @param value - 任意 WebView 输入。
 * @returns `true` 表示可按 `WebviewMessage` 处理。
 */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'ready':
      return true;
    case 'convertText':
      return isRecord(value.payload) && typeof value.payload.text === 'string';
    case 'convertImage':
      return isRecord(value.payload);
    case 'cancel':
      return isRecord(value.payload) && typeof value.payload.requestId === 'string';
    case 'savePreset':
      return isRecord(value.payload) && isRecord(value.payload.config);
    case 'copy':
      return isRecord(value.payload) && typeof value.payload.content === 'string';
    case 'insert':
      return isRecord(value.payload) &&
        typeof value.payload.content === 'string' &&
        typeof value.payload.mode === 'string';
    case 'save':
      return isRecord(value.payload) &&
        typeof value.payload.content === 'string' &&
        (value.payload.format === 'txt' || value.payload.format === 'html');
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
