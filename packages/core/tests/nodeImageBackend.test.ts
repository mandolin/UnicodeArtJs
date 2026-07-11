import {
  getNodeImageBackend,
  loadImage,
  napiRsImageBackend,
  resetNodeImageBackend,
  resizeImage,
  resolveNodeImageBackend,
  setNodeImageBackend,
  ErrorCode,
  UnicodeArtError,
  type NodeImageBackend
} from '../src';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

describe('Node image backend registry', () => {
  afterEach(() => {
    resetNodeImageBackend();
  });

  test('uses napi-rs as the default Node image backend', () => {
    expect(getNodeImageBackend().name).toBe('napi-rs');
    expect(resolveNodeImageBackend('napi-rs').name).toBe('napi-rs');
    expect(resolveNodeImageBackend('sharp').name).toBe('sharp');
  });

  test('allows a custom backend for loadImage and resizeImage', async () => {
    const backend: NodeImageBackend = {
      name: 'test-backend',
      async loadImage(input) {
        expect(input).toBe('virtual.png');
        return {
          width: 1,
          height: 1,
          data: new Uint8Array([42])
        };
      },
      async resizeImage(image, targetWidth, targetHeight) {
        // 中文注释：测试只验证调度边界，不在这里模拟真实插值算法。
        expect(image.data[0]).toBe(42);
        return {
          width: targetWidth,
          height: targetHeight,
          data: new Uint8Array(targetWidth * targetHeight).fill(7)
        };
      }
    };

    setNodeImageBackend(backend);

    const loaded = await loadImage('virtual.png');
    expect(loaded).toEqual({
      width: 1,
      height: 1,
      data: new Uint8Array([42])
    });

    const resized = await resizeImage(loaded, 2, 1);
    expect(resized).toEqual({
      width: 2,
      height: 1,
      data: new Uint8Array([7, 7])
    });
  });

  test('can reset a custom backend to napi-rs', () => {
    setNodeImageBackend({
      name: 'temporary',
      async loadImage() {
        return { width: 1, height: 1, data: new Uint8Array([0]) };
      }
    });

    expect(getNodeImageBackend().name).toBe('temporary');
    resetNodeImageBackend();
    expect(getNodeImageBackend().name).toBe('napi-rs');
  });

  test('loads a PNG through the default napi-rs backend', async () => {
    const imagePath = path.join(__dirname, 'test-image-zhong.png');

    const defaultImage = await loadImage(imagePath);
    const napiImage = await napiRsImageBackend.loadImage(imagePath);

    expect(defaultImage.width).toBe(napiImage.width);
    expect(defaultImage.height).toBe(napiImage.height);
    expect(defaultImage.data).toHaveLength(defaultImage.width * defaultImage.height);
    expect(averageAbsoluteDiff(napiImage.data, defaultImage.data)).toBe(0);
  });

  test('resizes grayscale data through the experimental napi-rs backend', async () => {
    const image = {
      width: 2,
      height: 2,
      data: new Uint8Array([0, 85, 170, 255])
    };

    const resized = await resizeImage(image, 4, 3, 'bilinear');

    expect(resized.width).toBe(4);
    expect(resized.height).toBe(3);
    expect(resized.data).toHaveLength(12);
  });

  test('loads first-batch formats through the experimental napi-rs backend', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'unicode-art-napi-'));

    try {
      const fixtures = await createNapiFixtureImages(tempDir);

      for (const fixture of fixtures) {
        const loaded = await napiRsImageBackend.loadImage(fixture);
        expect(loaded.width).toBe(2);
        expect(loaded.height).toBe(2);
        expect(loaded.data).toHaveLength(4);
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('rejects formats outside the experimental napi-rs first batch', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'unicode-art-napi-'));

    try {
      const { Transformer } = await import('@napi-rs/image');
      const icoPath = path.join(tempDir, 'sample.ico');
      await writeFile(icoPath, await Transformer.fromRgbaPixels(createTinyRgbaFixture(), 2, 2).ico());

      await expect(napiRsImageBackend.loadImage(icoPath)).rejects.toMatchObject({
        code: ErrorCode.UNSUPPORTED_FORMAT
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

async function createNapiFixtureImages(tempDir: string): Promise<string[]> {
  const { Transformer } = await import('@napi-rs/image');
  const rgba = createTinyRgbaFixture();
  const source = Transformer.fromRgbaPixels(rgba, 2, 2);
  const fixtures = [
    { filename: 'sample.png', buffer: await source.png() },
    { filename: 'sample.jpg', buffer: await Transformer.fromRgbaPixels(rgba, 2, 2).jpeg(90) },
    { filename: 'sample.webp', buffer: await Transformer.fromRgbaPixels(rgba, 2, 2).webp(90) },
    { filename: 'sample.bmp', buffer: await Transformer.fromRgbaPixels(rgba, 2, 2).bmp() }
  ];
  const paths: string[] = [];

  for (const fixture of fixtures) {
    const fixturePath = path.join(tempDir, fixture.filename);
    await writeFile(fixturePath, fixture.buffer);
    paths.push(fixturePath);
  }

  return paths;
}

function createTinyRgbaFixture(): Uint8Array {
  return new Uint8Array([
    0, 0, 0, 255,
    255, 255, 255, 255,
    255, 0, 0, 128,
    0, 255, 0, 255
  ]);
}

function averageAbsoluteDiff(left: Uint8Array, right: Uint8Array): number {
  if (left.length !== right.length) {
    throw new UnicodeArtError('测试数据长度不一致', ErrorCode.INTERNAL_ERROR, {
      leftLength: left.length,
      rightLength: right.length
    });
  }

  let total = 0;
  for (let index = 0; index < left.length; index++) {
    total += Math.abs(left[index] - right[index]);
  }

  return total / left.length;
}
