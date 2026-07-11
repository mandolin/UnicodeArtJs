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

/** 当前内置的 Node 图像后端名称。 */
export type NodeImageBackendName = 'sharp' | 'napi-rs';

/** Node 图像后端能力接口。 */
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

/** 获取当前 Node 图像后端。 */
export function getNodeImageBackend(): NodeImageBackend {
  return activeNodeImageBackend;
}

/** 获取指定内置 Node 图像后端。 */
export function resolveNodeImageBackend(name: NodeImageBackendName): NodeImageBackend {
  const backend = BUILTIN_NODE_IMAGE_BACKENDS[name];
  if (!backend) {
    throw new Error(`Unknown Node image backend: ${name}`);
  }
  return backend;
}

/** 设置当前 Node 图像后端。 */
export function setNodeImageBackend(backend: NodeImageBackend | NodeImageBackendName): void {
  activeNodeImageBackend = typeof backend === 'string'
    ? resolveNodeImageBackend(backend)
    : backend;
}

/** 重置为默认 napi-rs 后端。 */
export function resetNodeImageBackend(): void {
  activeNodeImageBackend = DEFAULT_NODE_IMAGE_BACKEND;
}

//#endregion
