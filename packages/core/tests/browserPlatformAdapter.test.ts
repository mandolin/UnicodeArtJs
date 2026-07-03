import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  browserPlatformAdapter,
  clearBrowserAdapterCache,
  getBrowserAdapterCacheStats,
  getBrowserRuntimeCapabilities,
  loadBrowserFont
} from '../src/platform/browser/browserPlatformAdapter';
import { imageToArt as browserImageToArt } from '../src/browser';
import { CharType, PresetCharset } from '../src/types/charset';
import { ErrorCode, OutputFormat } from '../src/types/output';

class MockCanvas {
  width = 0;
  height = 0;
  private readonly ctx = new MockContext(this);

  getContext(type: string): MockContext | null {
    return type === '2d' ? this.ctx : null;
  }
}

class MockContext {
  fillStyle = '#000000';
  font = '10px Arial';
  textBaseline = 'top';
  private pixels: Uint8ClampedArray | null = null;

  constructor(private readonly canvas: MockCanvas) {}

  fillRect(_x: number, _y: number, width: number, height: number): void {
    this.ensurePixels();
    const value = this.fillStyle === '#FFFFFF' ? 255 : 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.setPixel(x, y, value, value, value, 255);
      }
    }
  }

  fillText(text: string, x: number, y: number): void {
    this.ensurePixels();
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const width = Math.max(1, Math.min(this.canvas.width - startX, text.length || 1));
    const height = Math.max(1, Math.min(this.canvas.height - startY, 2));

    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        this.setPixel(startX + xx, startY + yy, 0, 0, 0, 255);
      }
    }
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 3 };
  }

  drawImage(source: any): void {
    this.ensurePixels();
    if (source?.__rgbaData) {
      this.pixels = new Uint8ClampedArray(source.__rgbaData);
    }
  }

  getImageData(_x: number, _y: number, width: number, height: number): { data: Uint8ClampedArray } {
    this.ensurePixels();
    const size = width * height * 4;
    if (!this.pixels || this.pixels.length !== size) {
      this.pixels = new Uint8ClampedArray(size).fill(255);
    }

    return { data: new Uint8ClampedArray(this.pixels) };
  }

  private ensurePixels(): void {
    const size = this.canvas.width * this.canvas.height * 4;
    if (!this.pixels || this.pixels.length !== size) {
      this.pixels = new Uint8ClampedArray(size).fill(255);
    }
  }

  private setPixel(x: number, y: number, r: number, g: number, b: number, a: number): void {
    if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) {
      return;
    }

    this.ensurePixels();
    const index = (y * this.canvas.width + x) * 4;
    this.pixels![index] = r;
    this.pixels![index + 1] = g;
    this.pixels![index + 2] = b;
    this.pixels![index + 3] = a;
  }
}

describe('browserPlatformAdapter', () => {
  const originalDocument = (globalThis as any).document;
  const originalOffscreenCanvas = (globalThis as any).OffscreenCanvas;
  const originalFontFace = (globalThis as any).FontFace;

  beforeEach(() => {
    clearBrowserAdapterCache();
    (globalThis as any).OffscreenCanvas = undefined;
    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag !== 'canvas') {
          throw new Error(`Unexpected element: ${tag}`);
        }
        return new MockCanvas();
      },
      fonts: {
        add: jest.fn()
      }
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).OffscreenCanvas = originalOffscreenCanvas;
    (globalThis as any).FontFace = originalFontFace;
  });

  test('accepts CoreImageData without conversion', async () => {
    const image = {
      width: 2,
      height: 1,
      data: new Uint8Array([0, 255])
    };

    await expect(browserPlatformAdapter.loadImage(image)).resolves.toBe(image);
  });

  test('converts DOM-like RGBA ImageData to CoreImageData', async () => {
    const image = await browserPlatformAdapter.loadImage({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255
      ])
    });

    expect(Array.from(image.data)).toEqual([76, 150]);
  });

  test('renders text through browser canvas APIs', async () => {
    const image = await browserPlatformAdapter.renderTextToImage('A', {
      font: 'Arial',
      fontSize: 4,
      width: 4,
      height: 4
    });

    expect(image.width).toBe(4);
    expect(image.height).toBe(4);
    expect(image.data.some((value) => value < 255)).toBe(true);
  });

  test('renders character matrices through browser canvas APIs', async () => {
    const matrix = await browserPlatformAdapter.renderCharToMatrix('A', {
      matrixSize: 4,
      font: 'Arial',
      fontSize: 4
    });

    expect(matrix).toBeInstanceOf(Float32Array);
    expect(matrix.length).toBe(16);
  });

  test('caches browser glyph matrices by rendering options', async () => {
    const first = await browserPlatformAdapter.renderCharToMatrix('A', {
      matrixSize: 4,
      font: 'Arial',
      fontSize: 4
    });
    const second = await browserPlatformAdapter.renderCharToMatrix('A', {
      matrixSize: 4,
      font: 'Arial',
      fontSize: 4
    });

    expect(second).toBe(first);
    expect(getBrowserAdapterCacheStats().glyphs).toBe(1);
  });

  test('precomputes character data through the browser adapter', async () => {
    const charData = await browserPlatformAdapter.precomputeCharData({
      charset: {
        type: PresetCharset.CUSTOM,
        customChars: 'A'
      },
      matrixSize: 4,
      font: 'Arial',
      fontSize: 4
    });

    expect(charData.get('A')).toMatchObject({
      char: 'A',
      type: CharType.NORMAL,
      width: 4,
      height: 4
    });
  });

  test('caches precomputed browser character data', async () => {
    const options = {
      charset: {
        type: PresetCharset.CUSTOM,
        customChars: 'A'
      },
      matrixSize: 4,
      font: 'Arial',
      fontSize: 4
    };

    const first = await browserPlatformAdapter.precomputeCharData(options);
    const second = await browserPlatformAdapter.precomputeCharData(options);

    expect(second).toBe(first);
    expect(getBrowserAdapterCacheStats().charData).toBe(1);
  });

  test('loads URL fonts with FontFace when available', async () => {
    const load = jest.fn().mockResolvedValue({ family: 'DemoFont' });
    const add = jest.fn();
    (globalThis as any).FontFace = jest.fn().mockImplementation(() => ({ load }));
    (globalThis as any).document.fonts.add = add;

    const family = await browserPlatformAdapter.loadFont('https://example.com/DemoFont.woff2', 'bold');

    expect(family).toBe('DemoFont');
    expect((globalThis as any).FontFace).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith({ family: 'DemoFont' });
  });

  test('caches URL font loads', async () => {
    const load = jest.fn().mockResolvedValue({ family: 'DemoFont' });
    (globalThis as any).FontFace = jest.fn().mockImplementation(() => ({ load }));

    const first = await browserPlatformAdapter.loadFont('https://example.com/DemoFont.woff2', 'bold');
    const second = await browserPlatformAdapter.loadFont('https://example.com/DemoFont.woff2', 'bold');

    expect(first).toBe('DemoFont');
    expect(second).toBe('DemoFont');
    expect(load).toHaveBeenCalledTimes(1);
    expect(getBrowserAdapterCacheStats().fonts).toBe(1);
  });

  test('loads ArrayBuffer fonts with FontFace when available', async () => {
    const load = jest.fn().mockResolvedValue({ family: 'ArrayFont' });
    const add = jest.fn();
    (globalThis as any).FontFace = jest.fn().mockImplementation(() => ({ load }));
    (globalThis as any).document.fonts.add = add;

    const buffer = new ArrayBuffer(8);
    const family = await loadBrowserFont(buffer, {
      family: 'ArrayFont',
      style: 'italic'
    });

    expect(family).toBe('ArrayFont');
    expect((globalThis as any).FontFace).toHaveBeenCalledWith(
      'ArrayFont',
      buffer,
      { weight: '400', style: 'italic' }
    );
    expect(load).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith({ family: 'ArrayFont' });
  });

  test('reports browser runtime capabilities', () => {
    const capabilities = getBrowserRuntimeCapabilities();

    expect(capabilities.canvas2d).toBe(true);
    expect(capabilities.offscreenCanvas).toBe(false);
    expect(capabilities).toHaveProperty('worker');
  });

  test('browser imageToArt reports progress with provided character data', async () => {
    const stages: string[] = [];
    const charDataMap = new Map([
      [' ', {
        char: ' ',
        matrix: new Float32Array(16).fill(1),
        type: CharType.NORMAL,
        width: 4,
        height: 4
      }],
      ['#', {
        char: '#',
        matrix: new Float32Array(16).fill(0),
        type: CharType.NORMAL,
        width: 4,
        height: 4
      }]
    ]);

    const result = await browserImageToArt(
      {
        width: 4,
        height: 4,
        data: new Uint8Array(16).fill(0)
      },
      {
        width: 1,
        height: 1,
        matrixSize: 4,
        outputFormat: OutputFormat.PLAIN_TEXT
      },
      {
        charDataMap,
        progress: (event) => stages.push(event.stage)
      }
    );

    expect(result.content).toContain('#');
    expect(result.rows).toBeGreaterThan(0);
    expect(stages).toEqual(['start', 'loadImage', 'precomputeChars', 'convert', 'done']);
  });

  test('browser imageToArt rejects oversized input images', async () => {
    const image = {
      width: 4,
      height: 4,
      data: new Uint8Array(16).fill(255)
    };

    await expect(browserImageToArt(image, { matrixSize: 4 }, { maxInputPixels: 8 }))
      .rejects
      .toMatchObject({
        code: ErrorCode.OUT_OF_MEMORY
      });
  });

  test('browser imageToArt honors aborted signals before work starts', async () => {
    const image = {
      width: 4,
      height: 4,
      data: new Uint8Array(16).fill(255)
    };

    await expect(browserImageToArt(image, { width: 1, height: 1, matrixSize: 4 }, {
      signal: { aborted: true }
    }))
      .rejects
      .toMatchObject({
        code: ErrorCode.INVALID_INPUT
      });
  });

  test('browser adapter source does not import Node-only modules', () => {
    const files = [
      join(__dirname, '..', 'src', 'browser.ts'),
      join(__dirname, '..', 'src', 'platform', 'browser', 'browserPlatformAdapter.ts')
    ];
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(source).not.toMatch(/from ['"].*preprocessor['"]/);
    expect(source).not.toMatch(/from ['"].*charRenderer['"]/);
    expect(source).not.toMatch(/require\s*\(/);
    expect(source).not.toMatch(/from ['"]sharp['"]/);
    expect(source).not.toMatch(/from ['"]canvas['"]/);
    expect(source).not.toMatch(/from ['"](?:node:)?(?:fs|path|os|child_process)['"]/);
  });
});
