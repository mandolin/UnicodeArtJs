/**
 * ============================================================================
 * 🟦 @napi-rs/image 实验 Node 图像后端
 * ============================================================================
 *
 * 🔶 模块职责
 * 使用 MIT 许可的 `@napi-rs/image` 提供默认 Node 图像后端，替代
 * sharp/libvips 默认路径。调用方仍可通过 `setNodeImageBackend()` 传入
 * 自定义后端，或在自行安装 sharp 后显式选择 legacy sharp adapter。
 *
 * 🔶 稳定性边界
 * - 首批只开放 PNG / JPEG / WebP / BMP。
 * - SVG / TIFF / AVIF / HEIC 等即使底层库支持，也暂不进入默认核心语义。
 * - 灰度转换、透明合成和错误包装由 Core 自己完成，便于后续沉淀统一规范。
 * ============================================================================
 */

import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';
import type { NodeImageBackend } from './imageBackend';

//#region 🟦 类型与常量

type NapiImageModule = typeof import('@napi-rs/image');
type NodeFsPromisesModule = typeof import('fs/promises');

/** `@napi-rs/image` 暴露的 JsColorType 数值。 */
enum NapiColorType {
  L8 = 0,
  La8 = 1,
  Rgb8 = 2,
  Rgba8 = 3,
  L16 = 4,
  La16 = 5,
  Rgb16 = 6,
  Rgba16 = 7,
  Rgb32F = 8,
  Rgba32F = 9
}

const SUPPORTED_NAPI_INPUT_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'bmp']);
const NODE_FS_PROMISES_MODULE = 'fs/promises';
const IS_LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const OPAQUE_ALPHA = 255;

let napiImageModulePromise: Promise<NapiImageModule> | undefined;
let nodeFsPromisesModulePromise: Promise<NodeFsPromisesModule> | undefined;

//#endregion

//#region 🟦 后端实现

/** MIT 许可的默认 Node 图像后端。 */
export const napiRsImageBackend: NodeImageBackend = {
  name: 'napi-rs',

  async loadImage(imagePath: string): Promise<CoreImageData> {
    try {
      const napi = await loadNapiImageModule();
      const input = await readImageFile(imagePath);
      const transformer = new napi.Transformer(input);
      const metadata = await transformer.metadata();

      assertSupportedInputFormat(metadata.format, imagePath);
      assertValidMetadata(metadata.width, metadata.height, imagePath);

      const rawPixels = await transformer.rawPixels();
      const grayData = rawPixelsToGrayscale(
        rawPixels,
        metadata.colorType,
        metadata.width,
        metadata.height,
        imagePath
      );

      return {
        width: metadata.width,
        height: metadata.height,
        data: grayData
      };
    } catch (error) {
      if (error instanceof UnicodeArtError) {
        throw error;
      }

      throw new UnicodeArtError(
        `@napi-rs/image加载图像失败: ${imagePath}`,
        ErrorCode.IMAGE_LOAD_FAILED,
        { originalError: error, backend: 'napi-rs', imagePath }
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
      const napi = await loadNapiImageModule();
      const rgba = grayscaleToOpaqueRgba(image.data, image.width, image.height);
      const transformer = napi.Transformer
        .fromRgbaPixels(rgba, image.width, image.height)
        .resize(targetWidth, targetHeight, resolveResizeFilter(napi, interpolation), napi.ResizeFit.Fill);

      const rawPixels = await transformer.rawPixels();
      const grayData = rawPixelsToGrayscale(
        rawPixels,
        NapiColorType.Rgba8,
        targetWidth,
        targetHeight,
        'resizeImage'
      );

      return {
        width: targetWidth,
        height: targetHeight,
        data: grayData
      };
    } catch (error) {
      if (error instanceof UnicodeArtError) {
        throw error;
      }

      throw new UnicodeArtError(
        `@napi-rs/image调整图像尺寸失败: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.IMAGE_PROCESSING_FAILED,
        { originalError: error, backend: 'napi-rs' }
      );
    }
  }
};

//#endregion

//#region 🟦 依赖加载与格式校验

async function loadNapiImageModule(): Promise<NapiImageModule> {
  if (!napiImageModulePromise) {
    napiImageModulePromise = import('@napi-rs/image').catch((error) => {
      napiImageModulePromise = undefined;
      throw new UnicodeArtError(
        '默认 Node 图像后端需要 @napi-rs/image，请确认该依赖已正确安装',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: '@napi-rs/image', backend: 'napi-rs', originalError: error }
      );
    });
  }

  return napiImageModulePromise;
}

async function readImageFile(imagePath: string): Promise<Uint8Array> {
  if (!nodeFsPromisesModulePromise) {
    // 中文注释：使用变量动态导入，避免 Rollup 在浏览器相关构建中静态追踪 Node 内置模块。
    nodeFsPromisesModulePromise = import(NODE_FS_PROMISES_MODULE) as Promise<NodeFsPromisesModule>;
  }

  return nodeFsPromisesModulePromise.then((fsPromises) => fsPromises.readFile(imagePath));
}

function assertSupportedInputFormat(format: string, imagePath: string): void {
  const normalized = format.toLowerCase();
  if (!SUPPORTED_NAPI_INPUT_FORMATS.has(normalized)) {
    throw new UnicodeArtError(
      `@napi-rs/image实验后端暂不支持此输入格式: ${format}`,
      ErrorCode.UNSUPPORTED_FORMAT,
      {
        backend: 'napi-rs',
        imagePath,
        format,
        supportedFormats: Array.from(SUPPORTED_NAPI_INPUT_FORMATS)
      }
    );
  }
}

function assertValidMetadata(width: number, height: number, imagePath: string): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new UnicodeArtError(
      `@napi-rs/image无法读取有效图像尺寸: ${imagePath}`,
      ErrorCode.IMAGE_LOAD_FAILED,
      { backend: 'napi-rs', imagePath, width, height }
    );
  }
}

//#endregion

//#region 🟦 像素转换

function rawPixelsToGrayscale(
  rawPixels: Uint8Array,
  colorType: number,
  width: number,
  height: number,
  source: string
): Uint8Array {
  const pixelCount = width * height;
  const dataView = new DataView(rawPixels.buffer, rawPixels.byteOffset, rawPixels.byteLength);

  switch (colorType) {
    case NapiColorType.L8:
      assertRawLength(rawPixels, pixelCount, source, colorType);
      return new Uint8Array(rawPixels);

    case NapiColorType.La8:
      assertRawLength(rawPixels, pixelCount * 2, source, colorType);
      return la8ToGrayscale(rawPixels, pixelCount);

    case NapiColorType.Rgb8:
      assertRawLength(rawPixels, pixelCount * 3, source, colorType);
      return rgb8ToGrayscale(rawPixels, pixelCount);

    case NapiColorType.Rgba8:
      assertRawLength(rawPixels, pixelCount * 4, source, colorType);
      return rgba8ToGrayscale(rawPixels, pixelCount);

    case NapiColorType.L16:
      assertRawLength(rawPixels, pixelCount * 2, source, colorType);
      return l16ToGrayscale(dataView, pixelCount);

    case NapiColorType.La16:
      assertRawLength(rawPixels, pixelCount * 4, source, colorType);
      return la16ToGrayscale(dataView, pixelCount);

    case NapiColorType.Rgb16:
      assertRawLength(rawPixels, pixelCount * 6, source, colorType);
      return rgb16ToGrayscale(dataView, pixelCount);

    case NapiColorType.Rgba16:
      assertRawLength(rawPixels, pixelCount * 8, source, colorType);
      return rgba16ToGrayscale(dataView, pixelCount);

    case NapiColorType.Rgb32F:
      assertRawLength(rawPixels, pixelCount * 12, source, colorType);
      return rgb32fToGrayscale(dataView, pixelCount);

    case NapiColorType.Rgba32F:
      assertRawLength(rawPixels, pixelCount * 16, source, colorType);
      return rgba32fToGrayscale(dataView, pixelCount);

    default:
      throw new UnicodeArtError(
        `@napi-rs/image实验后端暂不支持此像素类型: ${colorType}`,
        ErrorCode.UNSUPPORTED_FORMAT,
        { backend: 'napi-rs', source, colorType }
      );
  }
}

function assertRawLength(rawPixels: Uint8Array, expected: number, source: string, colorType: number): void {
  if (rawPixels.length !== expected) {
    throw new UnicodeArtError(
      `@napi-rs/image像素数据大小不匹配: 期望${expected}字节，实际${rawPixels.length}字节`,
      ErrorCode.IMAGE_LOAD_FAILED,
      { backend: 'napi-rs', source, colorType, expectedSize: expected, actualSize: rawPixels.length }
    );
  }
}

function la8ToGrayscale(rawPixels: Uint8Array, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 2;
    grayData[index] = compositeOverWhite(rawPixels[offset], rawPixels[offset + 1]);
  }
  return grayData;
}

function rgb8ToGrayscale(rawPixels: Uint8Array, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 3;
    grayData[index] = rgbToGrayscale(rawPixels[offset], rawPixels[offset + 1], rawPixels[offset + 2]);
  }
  return grayData;
}

function rgba8ToGrayscale(rawPixels: Uint8Array, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 4;
    const alpha = rawPixels[offset + 3];
    const red = compositeOverWhite(rawPixels[offset], alpha);
    const green = compositeOverWhite(rawPixels[offset + 1], alpha);
    const blue = compositeOverWhite(rawPixels[offset + 2], alpha);
    grayData[index] = rgbToGrayscale(red, green, blue);
  }
  return grayData;
}

function l16ToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    grayData[index] = readUint16AsByte(dataView, index * 2);
  }
  return grayData;
}

function la16ToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 4;
    grayData[index] = compositeOverWhite(readUint16AsByte(dataView, offset), readUint16AsByte(dataView, offset + 2));
  }
  return grayData;
}

function rgb16ToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 6;
    grayData[index] = rgbToGrayscale(
      readUint16AsByte(dataView, offset),
      readUint16AsByte(dataView, offset + 2),
      readUint16AsByte(dataView, offset + 4)
    );
  }
  return grayData;
}

function rgba16ToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 8;
    const alpha = readUint16AsByte(dataView, offset + 6);
    const red = compositeOverWhite(readUint16AsByte(dataView, offset), alpha);
    const green = compositeOverWhite(readUint16AsByte(dataView, offset + 2), alpha);
    const blue = compositeOverWhite(readUint16AsByte(dataView, offset + 4), alpha);
    grayData[index] = rgbToGrayscale(red, green, blue);
  }
  return grayData;
}

function rgb32fToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 12;
    grayData[index] = rgbToGrayscale(
      readFloat32AsByte(dataView, offset),
      readFloat32AsByte(dataView, offset + 4),
      readFloat32AsByte(dataView, offset + 8)
    );
  }
  return grayData;
}

function rgba32fToGrayscale(dataView: DataView, pixelCount: number): Uint8Array {
  const grayData = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 16;
    const alpha = readFloat32AsByte(dataView, offset + 12);
    const red = compositeOverWhite(readFloat32AsByte(dataView, offset), alpha);
    const green = compositeOverWhite(readFloat32AsByte(dataView, offset + 4), alpha);
    const blue = compositeOverWhite(readFloat32AsByte(dataView, offset + 8), alpha);
    grayData[index] = rgbToGrayscale(red, green, blue);
  }
  return grayData;
}

function grayscaleToOpaqueRgba(grayData: Uint8Array, width: number, height: number): Uint8Array {
  const pixelCount = width * height;
  assertRawLength(grayData, pixelCount, 'resizeImage', NapiColorType.L8);

  const rgba = new Uint8Array(pixelCount * 4);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 4;
    const gray = grayData[index];
    rgba[offset] = gray;
    rgba[offset + 1] = gray;
    rgba[offset + 2] = gray;
    rgba[offset + 3] = OPAQUE_ALPHA;
  }
  return rgba;
}

function rgbToGrayscale(red: number, green: number, blue: number): number {
  return (77 * red + 150 * green + 29 * blue) >> 8;
}

function compositeOverWhite(value: number, alpha: number): number {
  if (alpha >= OPAQUE_ALPHA) {
    return value;
  }

  if (alpha <= 0) {
    return OPAQUE_ALPHA;
  }

  return clampByte(Math.round((value * alpha + OPAQUE_ALPHA * (OPAQUE_ALPHA - alpha)) / OPAQUE_ALPHA));
}

function readUint16AsByte(dataView: DataView, byteOffset: number): number {
  return dataView.getUint16(byteOffset, IS_LITTLE_ENDIAN) >> 8;
}

function readFloat32AsByte(dataView: DataView, byteOffset: number): number {
  const value = dataView.getFloat32(byteOffset, IS_LITTLE_ENDIAN);
  return clampByte(Math.round(value <= 1 ? value * OPAQUE_ALPHA : value));
}

function clampByte(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= OPAQUE_ALPHA) {
    return OPAQUE_ALPHA;
  }

  return value;
}

//#endregion

//#region 🟦 resize 参数映射

function resolveResizeFilter(napi: NapiImageModule, interpolation: string): number {
  switch (interpolation) {
    case 'nearest':
      return napi.ResizeFilterType.Nearest;
    case 'bilinear':
      return napi.ResizeFilterType.Triangle;
    case 'lanczos':
      return napi.ResizeFilterType.Lanczos3;
    case 'bicubic':
    default:
      return napi.ResizeFilterType.CatmullRom;
  }
}

//#endregion
