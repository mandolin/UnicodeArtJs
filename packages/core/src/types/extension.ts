/**
 * ============================================================================
 * 🟦 UnicodeArtJs 扩展清单类型
 * ============================================================================
 *
 * 🔶 模块职责
 * 定义 UnicodeArtJs Extension Manifest v1 的平台无关模型。v1 只列出可验证的
 * 本地资源，不能携带、下载或执行 JavaScript、WASM、shell 命令和网络入口。
 *
 * 🔶 安全边界
 * - Core 只解析并校验 manifest，不读取其引用的文件。
 * - 文件系统边界、资源加载和用户信任提示由各宿主负责。
 * - 动态代码扩展必须使用新的 format version 与独立权限模型。
 *
 * @module types/extension
 * ============================================================================
 */

import type {
  UnicodeArtFontCreation,
  UnicodeArtFontLicense
} from './artFont';

//#region 🟦 格式、能力与目标

/** UAEM v1 的固定清单格式标识。 */
export const UNICODE_ART_EXTENSION_FORMAT = 'unicode-art-extension' as const;

/** 当前扩展清单格式标识。 */
export type UnicodeArtExtensionFormat = typeof UNICODE_ART_EXTENSION_FORMAT;

/** 当前支持的扩展清单版本。 */
export type UnicodeArtExtensionVersion = 1;

/** v1 允许的声明式资源种类，也是可协商能力标识。 */
export type UnicodeArtExtensionCapability =
  | 'semantic-document'
  | 'unicode-art-font';

/** 可作为兼容性目标的宿主类别。 */
export type UnicodeArtExtensionTarget =
  | 'node'
  | 'browser'
  | 'cli'
  | 'web'
  | 'vscode'
  | 'desktop';

//#endregion

//#region 🟦 清单结构

/** 扩展面向使用者和审计者的元数据。 */
export interface UnicodeArtExtensionMetadata {
  /** 稳定、反向 DNS 风格的扩展 ID。 */
  id: string;
  /** 面向使用者的扩展名称。 */
  name: string;
  /** 作者或维护者列表。 */
  authors: string[];
  /** 可选的简短说明。 */
  description?: string;
  /** 许可证、来源与归属信息。 */
  license: UnicodeArtFontLicense;
  /** 可选的创作方式说明。 */
  creation?: UnicodeArtFontCreation;
}

/** Core 与宿主的最小兼容性边界。 */
export interface UnicodeArtExtensionCompatibility {
  /** 扩展要求的最小 Core major.minor.patch 版本。 */
  minCoreVersion: string;
  /** 可选的 Core 开区间上界；达到此版本即不兼容。 */
  maxCoreVersionExclusive?: string;
  /** 可选的宿主类别白名单；缺省时不限制宿主类别。 */
  targets?: UnicodeArtExtensionTarget[];
}

/** 一个由扩展包贡献的本地资源。 */
export interface UnicodeArtExtensionResource {
  /** 清单内稳定的短 ID。 */
  id: string;
  /** 资源格式与所需能力。 */
  kind: UnicodeArtExtensionCapability;
  /** 相对 manifest 的安全 POSIX 路径。 */
  path: string;
  /** 可选的资源显示名。 */
  name?: string;
  /** 可选的资源说明。 */
  description?: string;
}

/** UAEM v1 的 canonical 清单。 */
export interface UnicodeArtExtensionManifestV1 {
  /** 固定为 unicode-art-extension。 */
  format: typeof UNICODE_ART_EXTENSION_FORMAT;
  /** 固定为 1。 */
  version: UnicodeArtExtensionVersion;
  /** 扩展元数据。 */
  meta: UnicodeArtExtensionMetadata;
  /** 扩展声明使用的能力。 */
  capabilities: UnicodeArtExtensionCapability[];
  /** Core 与宿主兼容性边界。 */
  compatibility: UnicodeArtExtensionCompatibility;
  /** 已声明的本地资源。 */
  resources: UnicodeArtExtensionResource[];
}

/** 当前 Core 可识别的扩展清单类型。 */
export type UnicodeArtExtensionManifest = UnicodeArtExtensionManifestV1;

//#endregion

//#region 🟦 解析与兼容性 API

/** 扩展清单解析或校验选项。 */
export interface UnicodeArtExtensionParseOptions {
  /** 结构化错误消息的语言。 */
  locale?: string;
}

/** 参与兼容性协商的宿主描述。 */
export interface UnicodeArtExtensionHost {
  /** 当前宿主类别。 */
  target: UnicodeArtExtensionTarget;
  /** 当前宿主实际连接的 Core major.minor.patch 版本。 */
  coreVersion: string;
  /** 宿主已启用且愿意处理的声明式能力。 */
  capabilities: readonly UnicodeArtExtensionCapability[];
}

/** 一项不可兼容原因。 */
export interface UnicodeArtExtensionCompatibilityReason {
  /** 稳定、机器可读的原因类型。 */
  code:
    | 'targetUnsupported'
    | 'coreVersionTooOld'
    | 'coreVersionTooNew'
    | 'capabilityMissing';
  /** 与原因相关的目标、版本或能力值。 */
  value: string;
}

/** 清单与宿主之间的确定性兼容性结果。 */
export interface UnicodeArtExtensionCompatibilityResult {
  /** 所有检查均通过时为 true。 */
  compatible: boolean;
  /** 按固定顺序收集的拒绝原因。 */
  reasons: UnicodeArtExtensionCompatibilityReason[];
}

//#endregion
