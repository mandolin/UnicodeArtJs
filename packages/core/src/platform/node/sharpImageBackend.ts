/**
 * ============================================================================
 * 🟦 sharp Node 图像后端
 * ============================================================================
 *
 * 🔶 模块职责
 * 将现有 sharp/libvips 图像加载与缩放能力收敛为显式 adapter，便于后续
 * permissive experimental adapter 并行对照和逐步替换。
 * ============================================================================
 */

import sharp from 'sharp';
import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';
import type { NodeImageBackend } from './imageBackend';

//#region 🟦 sharp adapter

/** 当前默认的 sharp 图像后端。 */
export const sharpImageBackend: NodeImageBackend = {
  name: 'sharp',

  async loadImage(imagePath: string): Promise<CoreImageData> {
    try {
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

