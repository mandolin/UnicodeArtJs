/**
 * ============================================================================
 * 🟦 Core 能力查询
 * ============================================================================
 *
 * 🔶 模块职责
 * 对外暴露 Core 当前 stable / experimental / reserved 能力边界，供 CLI、Web、
 * VSCode 等宿主在展示配置项和生成文档时读取同一份事实来源。
 *
 * 🔶 设计原则
 * - 只描述当前公开契约，不触发运行时探测。
 * - experimental 表示可用但仍可能调整语义或默认值。
 * - reserved 表示配置字段已冻结入口，但当前尚未完整影响 Core 输出。
 *
 * @module capabilities
 * ============================================================================
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n';
import { VERSION } from './version';

//#region 🟦 Capability Types

/** Core capability stability label. Core 能力稳定性标签。 */
export type CoreCapabilityStability = 'stable' | 'experimental' | 'reserved' | 'legacy';

/** Machine-readable descriptor for one Core capability. 单项 Core 能力的机器可读描述。 */
export interface CoreCapabilityDescriptor {
  /** 稳定的机器可读能力标识。 */
  id: string;
  /** 能力当前稳定性。 */
  stability: CoreCapabilityStability;
  /** 面向开发者的简短说明。 */
  description: string;
}

/** Node image-backend capability boundary. Node 图像后端能力边界。 */
export interface NodeImageBackendCapabilities {
  /** 当前默认后端。 */
  defaultBackend: 'napi-rs';
  /** Core 内置可解析的后端名称。 */
  availableBackends: readonly ('napi-rs' | 'sharp')[];
  /** legacy 后端需要用户自行安装依赖并显式启用。 */
  legacyBackends: readonly 'sharp'[];
  /** `napi-rs` 后端首批承诺格式。 */
  napiRsFirstBatchFormats: readonly ('png' | 'jpeg' | 'jpg' | 'webp' | 'bmp')[];
}

/** Node text-renderer capability boundary. Node 文本渲染后端能力边界。 */
export interface NodeTextRendererCapabilities {
  /** 当前默认的文字栅格化后端。 */
  defaultBackend: 'napi-rs-canvas';
  /** 默认后端使用的 npm runtime 包。 */
  runtimePackage: '@napi-rs/canvas';
  /** 调用面采用的兼容入口。 */
  compatibilityEntry: '@napi-rs/canvas/node-canvas';
}

/** Browser-entry capability boundary. 浏览器入口能力边界。 */
export interface BrowserEntryCapabilities {
  /** 当前浏览器适配基线。 */
  baseline: string;
  /** 浏览器高层转换是否仍按实验能力管理。 */
  experimental: boolean;
  /** 浏览器入口是否支持协作式取消。 */
  supportsAbortSignal: boolean;
  /** 浏览器入口是否支持进度回调。 */
  supportsProgress: boolean;
}

/** Box-frame capability boundary. 裱框能力边界。 */
export interface BoxCapabilities {
  /** 已稳定的裱框模式。 */
  stableModes: readonly string[];
  /** 实验中的布局阶段裱框模式。 */
  experimentalModes: readonly string[];
}

/** Immutable-shape Core capability snapshot. Core 总能力快照。 */
export interface CoreCapabilities {
  /** Core 包版本。 */
  version: string;
  /** 默认语言。 */
  defaultLocale: string;
  /** 支持的语言。 */
  supportedLocales: readonly string[];
  /** 稳定能力清单。 */
  stableFeatures: readonly CoreCapabilityDescriptor[];
  /** 实验能力清单。 */
  experimentalFeatures: readonly CoreCapabilityDescriptor[];
  /** 保留配置清单。 */
  reservedConfig: readonly CoreCapabilityDescriptor[];
  /** 兼容旧字段清单。 */
  legacyAliases: readonly CoreCapabilityDescriptor[];
  /** Node 图像后端能力。 */
  nodeImageBackends: NodeImageBackendCapabilities;
  /** Node 文本渲染后端能力。 */
  nodeTextRenderer: NodeTextRendererCapabilities;
  /** 浏览器入口能力。 */
  browserEntry: BrowserEntryCapabilities;
  /** 裱框能力。 */
  box: BoxCapabilities;
}

//#endregion

//#region 🟦 Capability Snapshot

const STABLE_FEATURES: CoreCapabilityDescriptor[] = [
  {
    id: 'node.textToArt',
    stability: 'stable',
    description: 'Node 文本转字符画主入口。'
  },
  {
    id: 'node.imageToArt',
    stability: 'stable',
    description: 'Node 图片文件转字符画主入口；默认后端为 napi-rs。'
  },
  {
    id: 'pure.imageDataToArt',
    stability: 'stable',
    description: '平台无关的灰度图像数据转字符画入口。'
  },
  {
    id: 'config.validation',
    stability: 'stable',
    description: '配置校验、默认值合并和新旧字段归一。'
  },
  {
    id: 'output.assembly',
    stability: 'stable',
    description: 'plain / html / ansi 输出组装。'
  },
  {
    id: 'box.post.outer',
    stability: 'stable',
    description: '生成完成后的外层裱框。'
  },
  {
    id: 'i18n.coreMessages',
    stability: 'stable',
    description: 'Core 错误消息 key 与 zh-CN / en-US fallback。'
  },
  {
    id: 'node.imageBackend.napi-rs',
    stability: 'stable',
    description: '@napi-rs/image 默认 Node 图像后端，首批格式为 PNG / JPEG / WebP / BMP。'
  },
  {
    id: 'node.textRenderer.napi-rs-canvas',
    stability: 'stable',
    description: '@napi-rs/canvas 默认 Node 文本渲染后端，使用 Skia 与 node-canvas 兼容入口。'
  }
];

const EXPERIMENTAL_FEATURES: CoreCapabilityDescriptor[] = [
  {
    id: 'browser.highLevelConversion',
    stability: 'experimental',
    description: '浏览器高层 textToArt / imageToArt，基线为 Chrome 120+。'
  },
  {
    id: 'browser.abortSignal',
    stability: 'experimental',
    description: '浏览器入口的协作式取消。'
  },
  {
    id: 'box.layoutStage',
    stability: 'experimental',
    description: 'layout 阶段 lines / cells / grid 裱框布局。'
  },
  {
    id: 'glyph.widthCalculation',
    stability: 'experimental',
    description: '字素宽度 profile 与受限自定义宽字素规则，影响布局、裱框和结果列数。'
  },
  {
    id: 'semantic.document',
    stability: 'experimental',
    description: '版本化语义文档 AST 与受限 DSL / JSON 解析入口。'
  },
  {
    id: 'artFont.document',
    stability: 'experimental',
    description: 'Unicode Art Font v1 JSON 格式、SPDX/provenance 校验与字形度量。'
  },
  {
    id: 'artFont.render',
    stability: 'experimental',
    description: '将嵌入 UAF 字体组装为多行艺术字，并可作为语义文档内容块参与布局。'
  },
  {
    id: 'extension.manifest',
    stability: 'experimental',
    description: 'UAEM v1 声明式扩展清单、版本兼容性协商和安全相对资源路径校验。'
  },
  {
    id: 'extension.declarativeResources',
    stability: 'experimental',
    description: '仅声明 semantic-document 与 unicode-art-font 本地资源；不执行第三方代码。'
  }
];

const RESERVED_CONFIG: CoreCapabilityDescriptor[] = [
  {
    id: 'config.charSpace',
    stability: 'reserved',
    description: '字符间距配置入口已保留，当前不改变文本渲染或采样结果。'
  },
  {
    id: 'config.maxParallelTasks',
    stability: 'reserved',
    description: '并行任务上限配置入口已保留，当前未启用 worker 并行策略。'
  },
  {
    id: 'config.visualFontDirectionalReduce',
    stability: 'reserved',
    description: '视觉字体四向手动纠偏入口已保留，当前不影响算法。'
  },
  {
    id: 'config.outputTarget',
    stability: 'reserved',
    description: '输出环境入口已保留，当前不改变采样结果。'
  }
];

const LEGACY_ALIASES: CoreCapabilityDescriptor[] = [
  {
    id: 'node.imageBackend.sharp',
    stability: 'legacy',
    description: 'legacy sharp 后端；默认不安装，用户需自行安装 sharp 并显式启用。'
  },
  {
    id: 'config.font',
    stability: 'legacy',
    description: '旧视觉字体字段，继续归一到 visualFont.family。'
  },
  {
    id: 'config.fontStyle',
    stability: 'legacy',
    description: '旧视觉字体样式字段，继续归一到 visualFont.style。'
  },
  {
    id: 'config.fontReduce',
    stability: 'legacy',
    description: '旧视觉字体收缩字段，继续归一到 visualFont.reduce。'
  },
  {
    id: 'config.glyphFontFamily',
    stability: 'legacy',
    description: '旧字素字体字段，继续归一到 glyphFont.family。'
  }
];

//#endregion

//#region 🟦 Public API

/**
 * Gets a snapshot of the current public Core capability boundary.
 *
 * 获取当前公开 Core 能力边界快照。返回值包含浅层副本，调用方可以安全读取；它不是运行时
 * 配置对象，修改返回值不会改变 Core 行为。
 *
 * @public
 * @returns The current Core capability snapshot. 当前 Core 能力快照。
 */
export function getCoreCapabilities(): CoreCapabilities {
  return {
    version: VERSION,
    defaultLocale: DEFAULT_LOCALE,
    supportedLocales: [...SUPPORTED_LOCALES],
    stableFeatures: STABLE_FEATURES.map((feature) => ({ ...feature })),
    experimentalFeatures: EXPERIMENTAL_FEATURES.map((feature) => ({ ...feature })),
    reservedConfig: RESERVED_CONFIG.map((feature) => ({ ...feature })),
    legacyAliases: LEGACY_ALIASES.map((feature) => ({ ...feature })),
    nodeImageBackends: {
      defaultBackend: 'napi-rs',
      availableBackends: ['napi-rs', 'sharp'],
      legacyBackends: ['sharp'],
      napiRsFirstBatchFormats: ['png', 'jpeg', 'jpg', 'webp', 'bmp']
    },
    nodeTextRenderer: {
      defaultBackend: 'napi-rs-canvas',
      runtimePackage: '@napi-rs/canvas',
      compatibilityEntry: '@napi-rs/canvas/node-canvas'
    },
    browserEntry: {
      baseline: 'Chrome 120+',
      experimental: true,
      supportsAbortSignal: true,
      supportsProgress: true
    },
    box: {
      stableModes: ['post:outer'],
      experimentalModes: ['layout:lines', 'layout:cells', 'layout:grid']
    }
  };
}

//#endregion
