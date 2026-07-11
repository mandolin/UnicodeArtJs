/**
 * ============================================================================
 * 🟦 Node 图像后端注册表
 * ============================================================================
 *
 * 🔶 模块职责
 * 为 Node 环境图片加载/缩放提供可替换后端边界。当前默认后端仍为 sharp，
 * 后续 permissive experimental adapter 会接入同一接口。
 * ============================================================================
 */

import type { CoreImageData } from '../../types/image';
import { sharpImageBackend } from './sharpImageBackend';

//#region 🟦 类型定义

/** 当前内置的 Node 图像后端名称。 */
export type NodeImageBackendName = 'sharp';

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
  sharp: sharpImageBackend
};

let activeNodeImageBackend: NodeImageBackend = sharpImageBackend;

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

/** 重置为默认 sharp 后端。 */
export function resetNodeImageBackend(): void {
  activeNodeImageBackend = sharpImageBackend;
}

//#endregion

