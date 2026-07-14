import { chromium } from 'playwright';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = new URL('..', import.meta.url);
const rootPath = fileURLToPath(rootDir);
const tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-browser-smoke-'));
const htmlPath = join(tempDir, 'index.html');

const createHtml = (browserEntryUrl) => String.raw`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>UnicodeArtJs Browser Smoke</title>
  </head>
  <body>
    <pre id="preview"></pre>
    <script type="module">
      import {
        browserPlatformAdapter,
        clearBrowserAdapterCache,
        getBrowserAdapterCacheStats,
        getBrowserRuntimeCapabilities,
        imageDataToArt,
        imageToArt,
        measureUnicodeArtFontText,
        parseUnicodeArtFontJson,
        semanticDocumentToArt,
        textToArt,
        boxText,
        CharType,
        OutputFormat,
        PresetCharset
      } from '${browserEntryUrl}';

      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };

      const capabilities = getBrowserRuntimeCapabilities();
      assert(capabilities.canvas2d === true, 'browser canvas2d capability missing');
      assert(typeof capabilities.worker === 'boolean', 'browser worker capability missing');
      clearBrowserAdapterCache();

      const rgba = new ImageData(
        new Uint8ClampedArray([
          255, 255, 255, 255, 255, 255, 255, 255,
          255, 255, 255, 255, 255, 255, 255, 255,
          255, 255, 255, 255, 255, 255, 255, 255,
          255, 255, 255, 255, 255, 255, 255, 255
        ]),
        4,
        2
      );
      const loadedImage = await browserPlatformAdapter.loadImage(rgba);
      assert(loadedImage.width === 4, 'loaded image width mismatch');
      assert(loadedImage.height === 2, 'loaded image height mismatch');
      assert(loadedImage.data.every((value) => value === 255), 'grayscale conversion mismatch');

      const charDataMap = new Map([
        ['@', {
          char: '@',
          matrix: new Float32Array(16).fill(0),
          type: CharType.NORMAL,
          width: 4,
          height: 4
        }],
        ['.', {
          char: '.',
          matrix: new Float32Array(16).fill(1),
          type: CharType.NORMAL,
          width: 4,
          height: 4
        }]
      ]);

      const art = await imageDataToArt(
        loadedImage,
        {
          height: 1,
          matrixSize: 4,
          outputFormat: OutputFormat.PLAIN_TEXT,
          charset: {
            type: PresetCharset.CUSTOM,
            customChars: '@.'
          }
        },
        { charDataMap }
      );
      assert(art.content.length > 0, 'imageDataToArt produced empty content');

      const progressStages = [];
      const browserImageArt = await imageToArt(
        rgba,
        {
          height: 1,
          matrixSize: 4,
          outputFormat: OutputFormat.PLAIN_TEXT,
          charset: {
            type: PresetCharset.CUSTOM,
            customChars: '@.'
          }
        },
        {
          charDataMap,
          progress: (event) => progressStages.push(event.stage)
        }
      );
      assert(browserImageArt.content.length > 0, 'browser imageToArt produced empty content');
      assert(progressStages.includes('done'), 'browser imageToArt progress did not complete');

      const textImage = await browserPlatformAdapter.renderTextToImage('Hi', {
        font: 'monospace',
        fontSize: 10,
        width: 32,
        height: 16
      });
      assert(textImage.data.some((value) => value < 255), 'text rendering produced blank image');

      const glyph = await browserPlatformAdapter.renderCharToMatrix('A', {
        matrixSize: 6,
        font: 'monospace',
        fontSize: 6
      });
      assert(glyph.length === 36, 'glyph matrix size mismatch');

      const generatedChars = await browserPlatformAdapter.precomputeCharData({
        charset: {
          type: PresetCharset.CUSTOM,
          customChars: 'A'
        },
        matrixSize: 6,
        font: 'monospace',
        fontSize: 6
      });
      assert(generatedChars.has('A'), 'precomputeCharData missing glyph');
      assert(getBrowserAdapterCacheStats().glyphs > 0, 'glyph cache was not populated');

      const browserTextArt = await textToArt(
        'Hi',
        {
          height: 1,
          matrixSize: 4,
          outputFormat: OutputFormat.PLAIN_TEXT,
          charset: {
            type: PresetCharset.CUSTOM,
            customChars: '@.'
          }
        },
        { charDataMap }
      );
      assert(browserTextArt.content.length > 0, 'browser textToArt produced empty content');

      const boxed = boxText('ok', {
        enabled: true,
        style: 'single',
        padding: 0
      });
      assert(boxed.includes('ok'), 'boxText failed in browser bundle');

      const semantic = await semanticDocumentToArt(
        {
          version: 1,
          options: { glyphWidthProfile: 'sarasa-mono-sc' },
          rows: [{ cells: [{ blocks: [{ kind: 'raw-text', text: '┌' }] }] }]
        },
        {
          height: 1,
          box: false,
          outputFormat: OutputFormat.PLAIN_TEXT,
          charset: { type: PresetCharset.ASCII }
        },
        { grid: false }
      );
      assert(semantic.content === '┌', 'browser semanticDocumentToArt content mismatch');
      assert(semantic.cols === 1, 'browser semanticDocumentToArt glyph width mismatch');

      const artFont = parseUnicodeArtFontJson(JSON.stringify({
        format: 'unicode-art-font',
        version: 1,
        meta: {
          id: 'org.unicodeartjs.browser-smoke',
          name: 'Browser Smoke',
          authors: ['UnicodeArtJs'],
          license: { expression: 'MIT', origin: 'original' }
        },
        metrics: { height: 1, defaultAdvance: 2, fallbackGlyph: '?' },
        glyphs: { A: { lines: ['AA'] }, '?': { lines: ['??'] } }
      }));
      const artFontMeasurement = measureUnicodeArtFontText(artFont, 'AΩ');
      assert(artFontMeasurement.cols === 4, 'browser Unicode art font measurement mismatch');
      assert(artFontMeasurement.missingGlyphs[0] === 'Ω', 'browser Unicode art font fallback mismatch');

      document.querySelector('#preview').textContent = art.content + '\n' + boxed;
      window.__UNICODE_ART_BROWSER_SMOKE__ = {
        ok: true,
        art: art.content,
        imageArt: browserImageArt.content,
        textArt: browserTextArt.content,
        semanticArt: semantic.content,
        artFontColumns: artFontMeasurement.cols,
        boxed,
        capabilities,
        cacheStats: getBrowserAdapterCacheStats(),
        progressStages
      };
    </script>
  </body>
</html>`;

let browser;
let server;

try {
  server = await startStaticServer(tempDir, rootPath);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  writeFileSync(htmlPath, createHtml(`${baseUrl}/dist/browser.esm.js`), 'utf8');

  browser = await chromium.launch(resolveLaunchOptions());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (message.text().includes('Failed to load resource')) {
        return;
      }
      errors.push(new Error(message.text()));
    }
  });

  await page.goto(`${baseUrl}/index.html`);
  try {
    await page.waitForFunction(() => globalThis.__UNICODE_ART_BROWSER_SMOKE__?.ok === true, null, {
      timeout: 30000
    });
  } catch (error) {
    if (errors.length > 0) {
      throw errors[0];
    }

    const state = await page.evaluate(() => ({
      readyState: document.readyState,
      smoke: globalThis.__UNICODE_ART_BROWSER_SMOKE__,
      preview: document.querySelector('#preview')?.textContent
    })).catch(() => null);

    throw new Error(`Browser smoke test timed out: ${error.message}; state=${JSON.stringify(state)}`);
  }
  const result = await page.evaluate(() => globalThis.__UNICODE_ART_BROWSER_SMOKE__);

  if (errors.length > 0) {
    throw errors[0];
  }

  if (!result?.ok) {
    throw new Error('Browser smoke test did not complete');
  }

  console.log(JSON.stringify({
    ok: true,
    chromium: await browser.version(),
    artLength: result.art.length,
    imageArtLength: result.imageArt.length,
    textArtLength: result.textArt.length,
    semanticArtLength: result.semanticArt.length,
    artFontColumns: result.artFontColumns,
    boxedLength: result.boxed.length,
    glyphCacheEntries: result.cacheStats.glyphs,
    workerSupported: result.capabilities.worker,
    entry: 'dist/browser.esm.js'
  }, null, 2));
} finally {
  if (browser) {
    await browser.close();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  rmSync(tempDir, { recursive: true, force: true });
}

function resolveLaunchOptions() {
  const executablePath = process.env.BROWSER_EXECUTABLE_PATH || findSystemBrowser();
  return executablePath
    ? { headless: true, executablePath }
    : { headless: true };
}

function findSystemBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA || ''}\\Chromium\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

async function startStaticServer(tempRoot, packageRoot) {
  const serverInstance = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
      const base = relativePath.startsWith('dist/') ? packageRoot : tempRoot;
      const filePath = join(base, relativePath);
      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': getContentType(filePath),
        'cache-control': 'no-store'
      });
      response.end(body);
    } catch (error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(String(error));
    }
  });

  await new Promise((resolve) => serverInstance.listen(0, '127.0.0.1', resolve));
  return serverInstance;
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.js')) {
    return 'text/javascript; charset=utf-8';
  }
  if (filePath.endsWith('.map')) {
    return 'application/json; charset=utf-8';
  }
  return 'application/octet-stream';
}
