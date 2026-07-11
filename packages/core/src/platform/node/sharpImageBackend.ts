/**
 * ============================================================================
 * 🟦 sharp Node 图像后端
 * ============================================================================
 *
 * 🔶 模块职责
 * 保留 legacy sharp/libvips 图像加载与缩放 adapter。
 *
 * 🔶 依赖边界
 * Core 不再把 sharp 作为默认依赖发布。本文件只能通过动态导入加载用户
 * 自行安装的 `sharp`，默认 npm / VSIX 产物不得携带 sharp/libvips。
 * ============================================================================
 */

import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';
import type { NodeImageBackend } from './imageBackend';

//#region 🟦 sharp adapter

type SharpMetadata = {
  width?: number;
  height?: number;
};

interface SharpInstance {
  metadata(): Promise<SharpMetadata>;
  grayscale(): SharpInstance;
  raw(): SharpInstance;
  resize(width: number, height: number, options?: { kernel?: string }): SharpInstance;
  toBuffer(): Promise<Buffer>;
}

type SharpFactory = (input: string | Buffer, options?: unknown) => SharpInstance;

const SHARP_MODULE_NAME = 'sharp';

let sharpFactoryPromise: Promise<SharpFactory> | undefined;

/** legacy sharp 图像后端；仅在用户显式安装 sharp 后可用。 */
export const sharpImageBackend: NodeImageBackend = {
  name: 'sharp',

  async loadImage(imagePath: string): Promise<CoreImageData> {
    try {
      const sharp = await loadSharpFactory();
      const sharpInstance = sharp(imagePath);
      const metadata = await sharpInstance.metadata();

      if (!metadata.width || !metadata.height) {
        throw new UnicodeArtError(
          `无法读取图像尺寸: ${imagePath}`,
          ErrorCode.IMAGE_LOAD_FAILED,
          { imagePath, metadata }
        );
      }

      const buffer = await sharpInstance
        .grayscale()
        .raw()
        .toBuffer();

      const expectedSize = metadata.width * metadata.height;
      if (buffer.length !== expectedSize) {
        throw new UnicodeArtError(
          `图像数据大小不匹配: 期望${expectedSize}字节，实际${buffer.length}字节`,
          ErrorCode.IMAGE_LOAD_FAILED,
          { imagePath, expectedSize, actualSize: buffer.length }
        );
      }

      return {
        width: metadata.width,
        height: metadata.height,
        data: new Uint8Array(buffer)
      };
    } catch (error) {
      if (error instanceof UnicodeArtError) {
        throw error;
      }

      throw new UnicodeArtError(
        `加载图像失败: ${imagePath}`,
        ErrorCode.IMAGE_LOAD_FAILED,
        { originalError: error }
      );
    }
  },

  async resizeImage(
    image: CoreImageData,
    targetWidth: number,
    targetHeight: number,
    interpolation: string = 'bicubic'
  ): Promise<CoreImageData> {
    try {
      const sharp = await loadSharpFactory();
      const buffer = Buffer.from(image.data);

      const resizedBuffer = await sharp(buffer, {
        raw: {
          width: image.width,
          height: image.height,
          channels: 1
        }
      })
        .resize(targetWidth, targetHeight, {
          kernel: interpolation as any
        })
        .grayscale()
        .raw()
        .toBuffer();

      return {
        width: targetWidth,
        height: targetHeight,
        data: new Uint8Array(resizedBuffer)
      };
    } catch (error) {
      throw new UnicodeArtError(
        `调整图像尺寸失败: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.IMAGE_PROCESSING_FAILED,
        { originalError: error }
      );
    }
  }
};

//#endregion

//#region 🟦 lazy dependency loading

async function loadSharpFactory(): Promise<SharpFactory> {
  if (!sharpFactoryPromise) {
    // 中文注释：用变量动态导入，避免打包器把 sharp 视为默认运行时依赖。
    // English: keep sharp out of the default dependency graph; users opt in explicitly.
    sharpFactoryPromise = import(SHARP_MODULE_NAME).then((module) => {
      const factory = (module as { default?: SharpFactory }).default ?? (module as unknown as SharpFactory);
      if (typeof factory !== 'function') {
        throw new Error('sharp module does not expose a callable default export');
      }
      return factory;
    }).catch((error) => {
      sharpFactoryPromise = undefined;
      throw new UnicodeArtError(
        'legacy sharp 后端需要用户自行安装 sharp 依赖；默认后端已切换为 napi-rs',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: 'sharp', backend: 'sharp', originalError: error }
      );
    });
  }

  return sharpFactoryPromise;
}

//#endregion
