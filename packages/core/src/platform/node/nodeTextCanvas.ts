/**
 * ============================================================================
 * 🟦 Node 文本 Canvas 运行时
 * ============================================================================
 *
 * 🔶 模块职责
 * 统一加载 `@napi-rs/canvas` 的 node-canvas 兼容入口，供 Node 文字栅格化、
 * 字素模板预计算和字体注册复用。
 *
 * 🔶 许可证与分发边界
 * - 默认路径使用基于 Skia 的 `@napi-rs/canvas`。
 * - 历史 `node-canvas`/Cairo 不再是 Core 默认依赖或默认安装内容。
 * - 兼容入口保持 `createCanvas()` / `registerFont()` 调用面，不能保证 Cairo
 *   与 Skia 的像素级或字符画字符串级一致。
 * ============================================================================
 */

//#region 🟦 Runtime module loading

/** npm 包提供的 node-canvas API 兼容层。 */
export const NODE_TEXT_CANVAS_MODULE = '@napi-rs/canvas/node-canvas';

/** 当前 Core 实际需要的最小兼容接口。 */
export interface NodeTextCanvasModule {
  createCanvas(width: number, height: number, type?: 'image' | 'svg'): any;
  registerFont(path: string, fontFace: { family: string; weight?: string; style?: string }): void;
}

let cachedCanvasModule: NodeTextCanvasModule | undefined;

/**
 * 获取默认的 Node 文本 Canvas 运行时。
 *
 * 中文说明：使用变量 `require()` 保持浏览器构建不静态追踪 Node 原生模块。
 */
export function getNodeTextCanvas(): NodeTextCanvasModule {
  if (!cachedCanvasModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loaded = require(NODE_TEXT_CANVAS_MODULE) as NodeTextCanvasModule & {
      default?: NodeTextCanvasModule;
    };
    cachedCanvasModule = loaded.default ?? loaded;
  }

  return cachedCanvasModule;
}

/** 判断异常是否来自默认 Skia Canvas 运行时无法加载。 */
export function isNodeTextCanvasUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const cannotLoadModule = candidate.code === 'MODULE_NOT_FOUND' ||
    candidate.code === 'ERR_DLOPEN_FAILED';

  return cannotLoadModule &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('@napi-rs/canvas');
}

/** 仅供测试隔离与未来 host adapter 注入使用。 */
export function resetNodeTextCanvasCache(): void {
  cachedCanvasModule = undefined;
}

//#endregion
