import {
  getNodeImageBackend,
  loadImage,
  resetNodeImageBackend,
  resizeImage,
  resolveNodeImageBackend,
  setNodeImageBackend,
  type NodeImageBackend
} from '../src';

describe('Node image backend registry', () => {
  afterEach(() => {
    resetNodeImageBackend();
  });

  test('uses sharp as the default Node image backend', () => {
    expect(getNodeImageBackend().name).toBe('sharp');
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

  test('can reset a custom backend to sharp', () => {
    setNodeImageBackend({
      name: 'temporary',
      async loadImage() {
        return { width: 1, height: 1, data: new Uint8Array([0]) };
      }
    });

    expect(getNodeImageBackend().name).toBe('temporary');
    resetNodeImageBackend();
    expect(getNodeImageBackend().name).toBe('sharp');
  });
});

