/**
 * ============================================================================
 * 🟦 Node 图像后端注册表
 * ============================================================================
 *
 * 🔶 模块职责
 * 为 Node 环境图片加载/缩放提供可替换后端边界。
 *
 * 🔶 默认策略
 * Core 默认使用宽松许可证口径下的 `napi-rs` 后端；`sharp` 仅作为 legacy
 * adapter 名称保留，调用方需要自行安装 sharp 并显式选择后才会加载。
 * ============================================================================
 */

import type { CoreImageData } from '../../types/image';
import { napiRsImageBackend } from './napiRsImageBackend';
import { sharpImageBackend } from './sharpImageBackend';

//#region 🟦 类型定义

/**
 * Built-in Node image backend name.
 *
 * 当前内置的 Node 图像后端名称。`napi-rs` 是默认清洁路径；`sharp` 为 legacy opt-in。
 *
 * @public
 */
export type NodeImageBackendName = 'sharp' | 'napi-rs';

/**
 * Node image backend adapter contract.
 *
 * Node 图像后端能力接口。自定义后端必须返回 Core 灰度图像数据，不能把后端私有像素格式
 * 泄漏到采样、匹配或输出层。
 *
 * @public
 */
export interface NodeImageBackend {
  /** 后端名称，用于诊断和测试。 */
  readonly name: string;

  /** 从本地文件或后端支持的输入中读取灰度图像数据。 */
  loadImage(input: string): Promise<CoreImageData>;

  /** 可选的灰度图像缩放能力。 */
  resizeImage?(
    image: CoreImageData,
    targetWidth: number,
    targetHeight: number,
    interpolation?: string
  ): Promise<CoreImageData>;
}

//#endregion

//#region 🟦 后端注册表

const BUILTIN_NODE_IMAGE_BACKENDS: Record<NodeImageBackendName, NodeImageBackend> = {
  'napi-rs': napiRsImageBackend,
  sharp: sharpImageBackend
};

const DEFAULT_NODE_IMAGE_BACKEND: NodeImageBackend = napiRsImageBackend;

let activeNodeImageBackend: NodeImageBackend = DEFAULT_NODE_IMAGE_BACKEND;

/**
 * Returns the active Node image backend.
 *
 * 获取当前 Node 图像后端。默认值为 `napi-rs`，除非调用方显式切换。
 *
 * @public
 */
export function getNodeImageBackend(): NodeImageBackend {
  return activeNodeImageBackend;
}

/**
 * Resolves a built-in Node image backend by name.
 *
 * 按名称获取内置 Node 图像后端；未知名称会抛出普通 `Error`，因为这是后端注册表层面的
 * 编程错误。
 *
 * @public
 */
export function resolveNodeImageBackend(name: NodeImageBackendName): NodeImageBackend {
  const backend = BUILTIN_NODE_IMAGE_BACKENDS[name];
  if (!backend) {
    throw new Error(`Unknown Node image backend: ${name}`);
  }
  return backend;
}

/**
 * Sets the active Node image backend.
 *
 * 设置当前 Node 图像后端。传入字符串时只能选择内置后端；传入对象时调用方负责该后端的
 * 许可证、依赖安装和输出语义。
 *
 * @public
 */
export function setNodeImageBackend(backend: NodeImageBackend | NodeImageBackendName): void {
  activeNodeImageBackend = typeof backend === 'string'
    ? resolveNodeImageBackend(backend)
    : backend;
}

/**
 * Resets the active Node image backend to the default `napi-rs` implementation.
 *
 * 重置为默认 `napi-rs` 后端，常用于测试隔离或临时 legacy 后端使用后恢复。
 *
 * @public
 */
export function resetNodeImageBackend(): void {
  activeNodeImageBackend = DEFAULT_NODE_IMAGE_BACKEND;
}

//#endregion
