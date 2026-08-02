import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadImage,
  napiRsImageBackend,
  resetNodeImageBackend,
  resizeImage,
  setNodeImageBackend,
  type CoreImageData,
  type NodeImageBackend
} from '../src';
import { browserPlatformAdapter } from '../src/platform/browser/browserPlatformAdapter';

/** One RGBA-to-grayscale semantic case. / 单个 RGBA 到灰度的语义用例。 */
interface RgbaSemanticCase {
  id: string;
  rgba: [number, number, number, number];
  expectedGray: number;
}

/** Versioned executable matrix consumed by this suite. / 本测试套件消费的版本化可执行矩阵。 */
interface ImageBackendSemanticMatrix {
  schema: string;
  formats: Array<'png' | 'jpeg' | 'webp' | 'bmp'>;
  rgbaCases: RgbaSemanticCase[];
  resize: {
    interpolations: Array<'nearest' | 'bilinear' | 'bicubic' | 'lanczos'>;
    constantGray: number;
    source: { width: number; height: number };
    target: { width: number; height: number };
  };
  errors: Array<{ id: string; expectedCode: string }>;
}

const matrix = JSON.parse(readFileSync(
  path.join(__dirname, 'fixtures', 'image-backend-semantic-matrix-v0.json'),
  'utf8'
)) as ImageBackendSemanticMatrix;

describe('image backend semantic matrix', () => {
  let temporaryDirectory: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'unicode-art-image-semantics-'));
  });

  afterEach(() => {
    resetNodeImageBackend();
  });

  afterAll(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  test('keeps the fixture schema version explicit', () => {
    expect(matrix.schema).toBe('unicodeartjs-image-backend-semantic-matrix@0');
  });

  test.each(matrix.formats)('loads the stable first-batch %s format', async (format) => {
    const imagePath = path.join(temporaryDirectory, `stable-format.${format}`);
    await writeFile(imagePath, await encodeImage(format, createFourColorRgbaFixture(), 2, 2));

    const image = await napiRsImageBackend.loadImage(imagePath);

    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(image.data).toHaveLength(4);
  });

  test.each(matrix.rgbaCases)('normalizes $id consistently in Node and browser adapters', async (semanticCase) => {
    const rgba = new Uint8Array(semanticCase.rgba);
    const imagePath = path.join(temporaryDirectory, `${semanticCase.id}.png`);
    await writeFile(imagePath, await encodeImage('png', rgba, 1, 1));

    const nodeImage = await napiRsImageBackend.loadImage(imagePath);
    const browserImage = await browserPlatformAdapter.loadImage({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(rgba)
    });

    expect(Array.from(nodeImage.data)).toEqual([semanticCase.expectedGray]);
    expect(Array.from(browserImage.data)).toEqual([semanticCase.expectedGray]);
  });

  test.each(matrix.resize.interpolations)('preserves a constant grayscale field with %s resize', async (interpolation) => {
    const source = createConstantImage(
      matrix.resize.source.width,
      matrix.resize.source.height,
      matrix.resize.constantGray
    );
    const { width, height } = matrix.resize.target;

    const nodeImage = await napiRsImageBackend.resizeImage!(source, width, height, interpolation);
    const browserImage = await browserPlatformAdapter.resizeImage!(source, width, height, interpolation);
    const expected = new Array(width * height).fill(matrix.resize.constantGray);

    expect(Array.from(nodeImage.data)).toEqual(expected);
    expect(Array.from(browserImage.data)).toEqual(expected);
  });

  test('keeps public error codes stable across rejected inputs', async () => {
    const expectedCodes = Object.fromEntries(matrix.errors.map((entry) => [entry.id, entry.expectedCode]));
    const missingPath = path.join(temporaryDirectory, 'missing.png');
    await expect(napiRsImageBackend.loadImage(missingPath)).rejects.toMatchObject({
      code: expectedCodes['missing-file']
    });

    const { Transformer } = await import('@napi-rs/image');
    const icoPath = path.join(temporaryDirectory, 'unsupported.ico');
    await writeFile(icoPath, await Transformer.fromRgbaPixels(createFourColorRgbaFixture(), 2, 2).ico());
    await expect(napiRsImageBackend.loadImage(icoPath)).rejects.toMatchObject({
      code: expectedCodes['unsupported-format']
    });

    await expect(browserPlatformAdapter.resizeImage!(
      { width: 2, height: 2, data: new Uint8Array([0]) },
      1,
      1
    )).rejects.toMatchObject({
      code: expectedCodes['invalid-browser-core-image']
    });

    setNodeImageBackend({
      name: 'load-only-fixture',
      async loadImage() {
        return createConstantImage(1, 1, 0);
      }
    });
    await expect(resizeImage(createConstantImage(1, 1, 0), 2, 2)).rejects.toMatchObject({
      code: expectedCodes['custom-backend-without-resize']
    });
  });

  test('dispatches load and resize through the active custom backend', async () => {
    const calls: string[] = [];
    const backend: NodeImageBackend = {
      name: 'semantic-matrix-fixture',
      async loadImage(input) {
        calls.push(`load:${input}`);
        return createConstantImage(1, 1, 41);
      },
      async resizeImage(_image, targetWidth, targetHeight, interpolation) {
        calls.push(`resize:${targetWidth}x${targetHeight}:${interpolation}`);
        return createConstantImage(targetWidth, targetHeight, 73);
      }
    };
    setNodeImageBackend(backend);

    const loaded = await loadImage('virtual-semantic-fixture.png');
    const resized = await resizeImage(loaded, 3, 2, 'nearest');

    expect(Array.from(resized.data)).toEqual(new Array(6).fill(73));
    expect(calls).toEqual([
      'load:virtual-semantic-fixture.png',
      'resize:3x2:nearest'
    ]);
  });
});

/**
 * Encodes a self-owned RGBA fixture through the installed default image dependency.
 * 使用当前已安装的默认图像依赖编码项目自有 RGBA fixture。
 *
 * @param format - Target image format. 目标图像格式。
 * @param rgba - RGBA bytes. RGBA 字节。
 * @param width - Image width. 图像宽度。
 * @param height - Image height. 图像高度。
 * @returns Encoded image bytes. 编码后的图像字节。
 */
async function encodeImage(
  format: 'png' | 'jpeg' | 'webp' | 'bmp',
  rgba: Uint8Array,
  width: number,
  height: number
): Promise<Buffer> {
  const { Transformer } = await import('@napi-rs/image');
  const transformer = Transformer.fromRgbaPixels(rgba, width, height);

  switch (format) {
    case 'jpeg':
      return transformer.jpeg(90);
    case 'webp':
      return transformer.webp(90);
    case 'bmp':
      return transformer.bmp();
    case 'png':
    default:
      return transformer.png();
  }
}

/**
 * Creates the self-owned four-color format fixture.
 * 创建项目自有的四色格式 fixture。
 *
 * @returns A 2×2 RGBA byte array. 2×2 RGBA 字节数组。
 */
function createFourColorRgbaFixture(): Uint8Array {
  return new Uint8Array([
    0, 0, 0, 255,
    255, 255, 255, 255,
    255, 0, 0, 128,
    0, 255, 0, 255
  ]);
}

/**
 * Creates canonical grayscale image data filled with one value.
 * 创建使用单一灰度值填充的规范图像数据。
 *
 * @param width - Image width. 图像宽度。
 * @param height - Image height. 图像高度。
 * @param gray - Grayscale byte. 灰度字节。
 * @returns Canonical Core image data. 规范 Core 图像数据。
 */
function createConstantImage(width: number, height: number, gray: number): CoreImageData {
  return {
    width,
    height,
    data: new Uint8Array(width * height).fill(gray)
  };
}
