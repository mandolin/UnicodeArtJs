/**
 * Defines the untrusted WebView-to-extension message boundary.
 *
 * @lang zh-CN 本模块集中定义 Converter WebView 协议，并在任何消息进入文件、配置、剪贴板或编辑器边界前执行严格白名单校验。
 * @lang en This module centralizes the Converter WebView protocol and applies strict allowlist validation before a message reaches file, configuration, clipboard, or editor boundaries.
 */
import type { ExtensionArtConfig } from '../config/types';
import type { InsertMode } from '../output/resultWriter';

// <lang><zh-CN>这些上限限制 WebView 可要求宿主保留或处理的内存，同时覆盖当前 UI 的正常文本、结果和图片规模。</zh-CN><en>These limits bound memory the WebView can ask the host to retain or process while covering the current UI's normal text, result, and image sizes.</en></lang>
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_OUTPUT_LENGTH = 10_000_000;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_DATA_LENGTH = 70 * 1024 * 1024;

// <lang><zh-CN>协议枚举与宿主实际支持面保持一致；未知值不得穿透为 Core 配置或编辑器写入指令。</zh-CN><en>Protocol enums mirror the host's actual support surface; unknown values must not pass through as Core configuration or editor-write instructions.</en></lang>
const CHARSETS = new Set(['ASCII', 'EXTENDED', 'CHINESE_SIMPLE', 'CUSTOM']);
const BOX_STYLES = new Set(['single', 'double', 'round', 'bold', 'classic', 'ascii', 'singleDouble', 'doubleSingle', 'arrow', 'block', 'thick', 'none']);
const INSERT_MODES = new Set<InsertMode>(['replaceSelection', 'beforeSelection', 'afterSelection', 'previousLine', 'nextLine', 'newDocument', 'clipboardOnly']);
const CONFIG_KEYS = new Set([
  'height', 'width', 'charset', 'customChars', 'visualFont', 'font', 'glyphFont', 'glyphWidthProfile',
  'wideCharRegex', 'matrixSize', 'ratio', 'invert', 'fontReduce', 'trimTrailingSpaces', 'box', 'insertMode',
  'preset', 'locale', 'outputTarget',
]);
const REQUIRED_CONFIG_KEYS = [...CONFIG_KEYS].filter((key) => key !== 'width');
const BOX_KEYS = new Set(['enabled', 'style', 'padding', 'margin', 'title', 'shadow']);
const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp']);
const LOCALES = new Set(['zh-CN', 'en-US']);
const OUTPUT_TARGETS = new Set(['vscode']);

/**
 * Describes one Converter template slot for display.
 *
 * @lang zh-CN 表示 Converter 初始化状态中一个可展示的模板槽，不包含模板正文之外的工作区数据。
 * @lang en Represents one displayable template slot in Converter initialization state and contains no workspace data beyond template metadata.
 */
export interface TemplateSlotView {
  /** <lang><zh-CN>从 1 开始的模板槽编号。</zh-CN><en>One-based template slot number.</en></lang> */
  slot: number;
  /** <lang><zh-CN>由宿主本地化后的展示标签。</zh-CN><en>Host-localized display label.</en></lang> */
  label: string;
  /** <lang><zh-CN>该槽是否已有持久化配置。</zh-CN><en>Whether the slot already has persisted configuration.</en></lang> */
  configured: boolean;
  /** <lang><zh-CN>已保存配置中的可选 preset 标识。</zh-CN><en>Optional preset identifier from the saved configuration.</en></lang> */
  preset?: string;
}

/**
 * Carries the host-owned initial state into the Converter WebView.
 *
 * @lang zh-CN 宿主在收到 ready 后发送此快照，用于填充控件、本地化消息、模板状态和受控选项。
 * @lang en The host sends this snapshot after ready to populate controls, localized messages, template state, and controlled options.
 */
export interface InitialWebviewState {
  /** <lang><zh-CN>当前有效扩展配置的快照。</zh-CN><en>Snapshot of the effective extension configuration.</en></lang> */
  config: ExtensionArtConfig;
  /** <lang><zh-CN>默认模板与三个自定义槽的配置状态。</zh-CN><en>Configuration state for the default template and three custom slots.</en></lang> */
  templates: {
    defaultConfigured: boolean;
    slots: TemplateSlotView[];
  };
  /** <lang><zh-CN>WebView 可直接使用的宿主本地化消息表。</zh-CN><en>Host-localized message table directly usable by the WebView.</en></lang> */
  i18n: Record<string, string>;
  /** <lang><zh-CN>宿主认可的 WebView 下拉选项，防止前端自行扩展协议枚举。</zh-CN><en>Host-approved WebView select options that prevent the frontend from inventing protocol enum values.</en></lang> */
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
 * Carries one text conversion request.
 *
 * @lang zh-CN 文本和可选配置覆盖均来自不可信 WebView；宿主只在结构、长度与配置白名单通过后处理它们。
 * @lang en Text and optional configuration overrides originate in the untrusted WebView; the host processes them only after shape, length, and configuration allowlist validation.
 */
export interface ConvertTextPayload {
  /** <lang><zh-CN>待转换文本，最多一百万个 UTF-16 code unit。</zh-CN><en>Text to convert, limited to one million UTF-16 code units.</en></lang> */
  text: string;
  /** <lang><zh-CN>本次请求的受控配置覆盖。</zh-CN><en>Controlled configuration overrides for this request.</en></lang> */
  config?: Partial<ExtensionArtConfig>;
  /** <lang><zh-CN>用于取消请求和丢弃过期结果的可选短 ID。</zh-CN><en>Optional short ID used to cancel a request and discard stale results.</en></lang> */
  requestId?: string;
}

/**
 * Carries one image conversion request without exposing a host file path.
 *
 * @lang zh-CN 图片只能以受支持 MIME 的 data URL 进入宿主；文件名只用于推导受控临时扩展名，不能含路径分隔符。
 * @lang en Images can enter the host only as data URLs with supported MIME types; the file name is used solely to derive a controlled temporary extension and cannot contain path separators.
 */
export interface ConvertImagePayload {
  /** <lang><zh-CN>受支持图片 MIME 的 base64 data URL。</zh-CN><en>Base64 data URL for a supported image MIME type.</en></lang> */
  imageData: string;
  /** <lang><zh-CN>不含路径的可选原始文件名。</zh-CN><en>Optional original file name without a path.</en></lang> */
  fileName?: string;
  /** <lang><zh-CN>浏览器报告的图片字节数，仅作为前置规模门禁。</zh-CN><en>Browser-reported image byte count used only as a preflight size gate.</en></lang> */
  fileSize: number;
  /** <lang><zh-CN>必须与 data URL 一致的受支持 MIME 类型。</zh-CN><en>Supported MIME type that must match the data URL.</en></lang> */
  mimeType: string;
  /** <lang><zh-CN>本次请求的受控配置覆盖。</zh-CN><en>Controlled configuration overrides for this request.</en></lang> */
  config?: Partial<ExtensionArtConfig>;
  /** <lang><zh-CN>用于协作式取消的可选短 ID。</zh-CN><en>Optional short ID used for cooperative cancellation.</en></lang> */
  requestId?: string;
}

/** <lang><zh-CN>宿主允许 WebView 请求保存的文本格式。</zh-CN><en>Text formats the WebView may ask the host to save.</en></lang> */
export type SaveFormat = 'txt' | 'html';

/** <lang><zh-CN>宿主允许 WebView 写入的预设目标。</zh-CN><en>Preset targets the WebView may ask the host to write.</en></lang> */
export type PresetSaveTarget = 'recent' | 'default' | 'slot';

/**
 * Enumerates messages accepted from the untrusted Converter WebView.
 *
 * @lang zh-CN 每个分支由 isWebviewMessage 执行精确字段、枚举、范围与长度校验；类型本身不构成运行时信任。
 * @lang en Each branch receives exact field, enum, range, and length validation from isWebviewMessage; the type alone does not establish runtime trust.
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
 * Enumerates host messages sent to the Converter WebView.
 *
 * @lang zh-CN 这些消息只携带初始化状态、转换进度、结果、模板状态或可展示诊断，不授予 WebView 宿主 API 能力。
 * @lang en These messages carry initialization state, conversion progress, results, template state, or displayable diagnostics and grant no host API capability to the WebView.
 */
export type ExtensionMessage =
  | { type: 'readyAck'; payload: InitialWebviewState }
  | { type: 'progress'; payload: { stage: string; progress: number } }
  | { type: 'result'; payload: { content: string; rows: number; cols: number; source: 'text' | 'image' } }
  | { type: 'templateState'; payload: InitialWebviewState['templates'] }
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'notice'; payload: { message: string } };

/**
 * Validates one unknown WebView message against the complete host protocol.
 *
 * @param value - Unknown <lang><zh-CN>WebView 输入值</zh-CN><en>WebView input value</en></lang>.
 * @returns <lang><zh-CN>仅当消息的字段集合、类型、枚举、范围和长度均受支持时返回 true。</zh-CN><en>True only when the message's field set, types, enums, ranges, and lengths are all supported.</en></lang>
 * @lang zh-CN 该 gate 拒绝额外字段和模糊配置，防止消息在后续分支中获得未声明语义。
 * @lang en This gate rejects extra fields and ambiguous configuration so messages cannot acquire undeclared semantics in later branches.
 */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
  // <lang><zh-CN>顶层只允许 type 与按分支需要的 payload；非对象或非字符串判别值立即拒绝。</zh-CN><en>The top level permits only type and branch-specific payload; reject non-objects or non-string discriminants immediately.</en></lang>
  if (!isRecord(value) || typeof value.type !== 'string' || !hasOnlyKeys(value, new Set(['type', 'payload']))) return false;

  switch (value.type) {
    case 'ready':
      // <lang><zh-CN>握手消息不得夹带 payload 或额外能力声明。</zh-CN><en>The handshake message cannot carry a payload or extra capability claims.</en></lang>
      return !hasOwn(value, 'payload');
    case 'convertText':
      return isConvertTextPayload(value.payload);
    case 'convertImage':
      return isConvertImagePayload(value.payload);
    case 'cancel':
      return isRecordWithKeys(value.payload, ['requestId']) && isRequestId(value.payload.requestId);
    case 'savePreset':
      return isPresetPayload(value.payload);
    case 'copy':
      return isRecordWithKeys(value.payload, ['content']) && isBoundedString(value.payload.content, MAX_OUTPUT_LENGTH);
    case 'insert':
      return isRecordWithKeys(value.payload, ['content', 'mode']) &&
        isBoundedString(value.payload.content, MAX_OUTPUT_LENGTH) && isInsertMode(value.payload.mode);
    case 'save':
      return isSavePayload(value.payload);
    default:
      return false;
  }
}

/**
 * Validates the text-conversion branch payload.
 *
 * @param value - Unknown <lang><zh-CN>文本转换载荷</zh-CN><en>text-conversion payload</en></lang>.
 * @returns <lang><zh-CN>载荷符合文本分支白名单时返回 true。</zh-CN><en>True when the payload satisfies the text-branch allowlist.</en></lang>
 */
function isConvertTextPayload(value: unknown): value is ConvertTextPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['text', 'config', 'requestId']))) return false;
  return isBoundedString(value.text, MAX_TEXT_LENGTH) &&
    isOptionalConfig(value.config) && isOptionalRequestId(value.requestId);
}

/**
 * Validates the image-conversion branch payload and keeps paths out of the protocol.
 *
 * @param value - Unknown <lang><zh-CN>图片转换载荷</zh-CN><en>image-conversion payload</en></lang>.
 * @returns <lang><zh-CN>data URL、MIME、规模、文件名和配置均安全时返回 true。</zh-CN><en>True when the data URL, MIME, size, file name, and configuration are all safe.</en></lang>
 */
function isConvertImagePayload(value: unknown): value is ConvertImagePayload {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['imageData', 'fileName', 'fileSize', 'mimeType', 'config', 'requestId']))) return false;
  if (!isBoundedString(value.imageData, MAX_IMAGE_DATA_LENGTH) || !isSupportedImageMime(value.mimeType)) return false;

  // <lang><zh-CN>前缀必须与声明 MIME 完全一致，避免后续扩展名回退掩盖内容类型差异。</zh-CN><en>The prefix must exactly match the declared MIME type so later extension fallback cannot hide a content-type mismatch.</en></lang>
  if (!value.imageData.startsWith(`data:${value.mimeType};base64,`)) return false;

  return isIntegerInRange(value.fileSize, 1, MAX_IMAGE_BYTES) &&
    isOptionalFileName(value.fileName) && isOptionalConfig(value.config) && isOptionalRequestId(value.requestId);
}

/**
 * Validates a full preset snapshot and its selected persistence target.
 *
 * @param value - Unknown <lang><zh-CN>预设保存载荷</zh-CN><en>preset-save payload</en></lang>.
 * @returns <lang><zh-CN>完整配置与目标组合有效时返回 true。</zh-CN><en>True when the full configuration and target combination are valid.</en></lang>
 */
function isPresetPayload(value: unknown): value is Extract<WebviewMessage, { type: 'savePreset' }>['payload'] {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['config', 'target', 'slot'])) || !isExtensionConfig(value.config, true)) return false;

  // <lang><zh-CN>省略 target 表示 recent；slot 目标必须携带 1 至 3，其他目标不能夹带槽号。</zh-CN><en>An omitted target means recent; slot requires 1 through 3, while other targets cannot smuggle a slot number.</en></lang>
  const target = value.target ?? 'recent';
  if (target !== 'recent' && target !== 'default' && target !== 'slot') return false;
  return target === 'slot' ? isIntegerInRange(value.slot, 1, 3) : value.slot === undefined;
}

/**
 * Validates one host-mediated file-save request.
 *
 * @param value - Unknown <lang><zh-CN>文件保存载荷</zh-CN><en>file-save payload</en></lang>.
 * @returns <lang><zh-CN>内容、格式和可选 HTML 字体字段有效时返回 true。</zh-CN><en>True when content, format, and the optional HTML font field are valid.</en></lang>
 */
function isSavePayload(value: unknown): value is Extract<WebviewMessage, { type: 'save' }>['payload'] {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['content', 'format', 'glyphFont'])) || !isBoundedString(value.content, MAX_OUTPUT_LENGTH)) return false;
  if (value.format !== 'txt' && value.format !== 'html') return false;
  return value.glyphFont === undefined || (value.format === 'html' && isBoundedString(value.glyphFont, 1_024));
}

/**
 * Validates either a partial request override or a complete persisted configuration.
 *
 * @param value - Unknown <lang><zh-CN>配置候选值</zh-CN><en>configuration candidate</en></lang>.
 * @param requireComplete - <lang><zh-CN>为 true 时要求除可选 width 外的全部字段。</zh-CN><en>When true, requires every field except optional width.</en></lang>.
 * @returns <lang><zh-CN>配置仅含当前 Converter 支持字段且每个值合法时返回 true。</zh-CN><en>True when the configuration contains only current Converter fields and every value is valid.</en></lang>
 */
function isExtensionConfig(value: unknown, requireComplete: boolean): value is Partial<ExtensionArtConfig> {
  if (!isRecord(value) || !hasOnlyKeys(value, CONFIG_KEYS)) return false;

  // <lang><zh-CN>持久化模板必须是完整快照；转换请求可只覆盖任意安全子集。</zh-CN><en>Persisted templates must be complete snapshots; conversion requests may override any safe subset.</en></lang>
  if (requireComplete && !REQUIRED_CONFIG_KEYS.every((key) => hasOwn(value, key))) return false;

  return isOptionalInteger(value, 'height', 1, 300) &&
    isOptionalInteger(value, 'width', 1, 1_000) &&
    isOptionalEnum(value, 'charset', CHARSETS) &&
    isOptionalBoundedString(value, 'customChars', 4_096) &&
    isOptionalBoundedString(value, 'visualFont', 1_024) &&
    isOptionalBoundedString(value, 'font', 1_024) &&
    isOptionalBoundedString(value, 'glyphFont', 1_024) &&
    isOptionalBoundedString(value, 'glyphWidthProfile', 128) &&
    isOptionalBoundedString(value, 'wideCharRegex', 2_048) &&
    isOptionalInteger(value, 'matrixSize', 2, 32) &&
    isOptionalNumber(value, 'ratio', 0.1, 10) &&
    isOptionalBoolean(value, 'invert') &&
    isOptionalNumber(value, 'fontReduce', 0, 20) &&
    isOptionalBoolean(value, 'trimTrailingSpaces') &&
    isOptionalBox(value, 'box') &&
    isOptionalInsertMode(value, 'insertMode') &&
    isOptionalBoundedString(value, 'preset', 128) &&
    isOptionalEnum(value, 'locale', LOCALES) &&
    isOptionalEnum(value, 'outputTarget', OUTPUT_TARGETS);
}

/**
 * Validates the bounded Box subset emitted by the current Converter UI.
 *
 * @param value - Unknown <lang><zh-CN>裱框配置候选值</zh-CN><en>Box configuration candidate</en></lang>.
 * @returns <lang><zh-CN>false 或当前 UI 的简单裱框对象有效时返回 true。</zh-CN><en>True for false or a valid simple Box object emitted by the current UI.</en></lang>
 */
function isWebviewBox(value: unknown): boolean {
  if (value === false) return true;
  if (!isRecord(value) || !hasOnlyKeys(value, BOX_KEYS)) return false;
  return isOptionalBoolean(value, 'enabled') &&
    isOptionalEnum(value, 'style', BOX_STYLES) &&
    isOptionalInteger(value, 'padding', 0, 20) &&
    isOptionalInteger(value, 'margin', 0, 20) &&
    isOptionalBoundedString(value, 'title', 200) &&
    isOptionalBoolean(value, 'shadow');
}

/** <lang><zh-CN>判断值是否为非空、长度受限的请求 ID。</zh-CN><en>Checks whether a value is a non-empty bounded request ID.</en></lang> */
function isRequestId(value: unknown): value is string {
  return isBoundedString(value, 128) && value.length > 0;
}

/** <lang><zh-CN>校验可选请求 ID；undefined 表示调用方不需要取消关联。</zh-CN><en>Validates an optional request ID; undefined means the caller needs no cancellation correlation.</en></lang> */
function isOptionalRequestId(value: unknown): value is string | undefined {
  return value === undefined || isRequestId(value);
}

/** <lang><zh-CN>校验可选图片文件名并拒绝任何路径分隔符。</zh-CN><en>Validates an optional image file name and rejects every path separator.</en></lang> */
function isOptionalFileName(value: unknown): value is string | undefined {
  return value === undefined || (isBoundedString(value, 255) && !/[\\/]/u.test(value));
}

/** <lang><zh-CN>校验当前 Node 图片路径支持的 MIME 类型。</zh-CN><en>Validates MIME types supported by the current Node image path.</en></lang> */
function isSupportedImageMime(value: unknown): value is string {
  return typeof value === 'string' && IMAGE_MIME_TYPES.has(value);
}

/** <lang><zh-CN>校验可选配置覆盖；undefined 表示使用宿主解析值。</zh-CN><en>Validates optional configuration overrides; undefined means use host-resolved values.</en></lang> */
function isOptionalConfig(value: unknown): value is Partial<ExtensionArtConfig> | undefined {
  return value === undefined || isExtensionConfig(value, false);
}

/** <lang><zh-CN>校验字符串类型及 UTF-16 长度上限。</zh-CN><en>Validates string type and a UTF-16 length ceiling.</en></lang> */
function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum;
}

/** <lang><zh-CN>校验有限数值位于闭区间内。</zh-CN><en>Validates that a finite number lies within a closed interval.</en></lang> */
function isNumberInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

/** <lang><zh-CN>校验安全整数位于闭区间内。</zh-CN><en>Validates that a safe integer lies within a closed interval.</en></lang> */
function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

/** <lang><zh-CN>校验对象只含指定字段。</zh-CN><en>Validates that an object contains only the specified fields.</en></lang> */
function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

/** <lang><zh-CN>同时校验对象形态与精确字段集合。</zh-CN><en>Validates both object shape and an exact field set.</en></lang> */
function isRecordWithKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return isRecord(value) && keys.every((key) => hasOwn(value, key)) && Object.keys(value).length === keys.length;
}

/** <lang><zh-CN>校验可选整数配置字段。</zh-CN><en>Validates an optional integer configuration field.</en></lang> */
function isOptionalInteger(value: Record<string, unknown>, key: string, minimum: number, maximum: number): boolean {
  return !hasOwn(value, key) || value[key] === undefined || isIntegerInRange(value[key], minimum, maximum);
}

/** <lang><zh-CN>校验可选有限数值配置字段。</zh-CN><en>Validates an optional finite-number configuration field.</en></lang> */
function isOptionalNumber(value: Record<string, unknown>, key: string, minimum: number, maximum: number): boolean {
  return !hasOwn(value, key) || isNumberInRange(value[key], minimum, maximum);
}

/** <lang><zh-CN>校验可选布尔配置字段。</zh-CN><en>Validates an optional boolean configuration field.</en></lang> */
function isOptionalBoolean(value: Record<string, unknown>, key: string): boolean {
  return !hasOwn(value, key) || typeof value[key] === 'boolean';
}

/** <lang><zh-CN>校验可选长度受限字符串配置字段。</zh-CN><en>Validates an optional bounded-string configuration field.</en></lang> */
function isOptionalBoundedString(value: Record<string, unknown>, key: string, maximum: number): boolean {
  return !hasOwn(value, key) || value[key] === undefined || isBoundedString(value[key], maximum);
}

/** <lang><zh-CN>校验可选字符串枚举配置字段。</zh-CN><en>Validates an optional string-enum configuration field.</en></lang> */
function isOptionalEnum(value: Record<string, unknown>, key: string, allowed: ReadonlySet<string>): boolean {
  return !hasOwn(value, key) || (typeof value[key] === 'string' && allowed.has(value[key]));
}

/** <lang><zh-CN>校验可选编辑器插入模式。</zh-CN><en>Validates an optional editor insertion mode.</en></lang> */
function isOptionalInsertMode(value: Record<string, unknown>, key: string): boolean {
  return !hasOwn(value, key) || isInsertMode(value[key]);
}

/** <lang><zh-CN>校验编辑器插入模式属于宿主固定枚举。</zh-CN><en>Validates that an editor insertion mode belongs to the host's fixed enum.</en></lang> */
function isInsertMode(value: unknown): value is InsertMode {
  return typeof value === 'string' && INSERT_MODES.has(value as InsertMode);
}

/** <lang><zh-CN>校验可选裱框配置。</zh-CN><en>Validates optional Box configuration.</en></lang> */
function isOptionalBox(value: Record<string, unknown>, key: string): boolean {
  return !hasOwn(value, key) || isWebviewBox(value[key]);
}

/** <lang><zh-CN>以兼容 VS Code 1.90 编译基线的方式检查自有属性。</zh-CN><en>Checks own properties in a form compatible with the VS Code 1.90 compilation baseline.</en></lang> */
function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

/** <lang><zh-CN>仅接受非 null、非数组对象作为协议记录。</zh-CN><en>Accepts only non-null, non-array objects as protocol records.</en></lang> */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
