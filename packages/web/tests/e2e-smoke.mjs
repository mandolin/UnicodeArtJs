/**
 * UnicodeArtJs Web E2E smoke test.
 *
 * Run with:
 *   npm run test:e2e
 *
 * If BASE_URL is set, the test uses that URL. Otherwise it starts an isolated
 * Vite server on a free localhost port and closes it after the run.
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

//#region Test Helpers

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  OK ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${name}: ${error.message}`);
  }
}

async function createTestServer() {
  if (process.env.BASE_URL) {
    return {
      baseUrl: process.env.BASE_URL,
      close: async () => {},
    };
  }

  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, 'vite.config.js'),
    server: {
      host: '127.0.0.1',
      port: 0,
      open: false,
      strictPort: false,
    },
  });

  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    await server.close();
    throw new Error('Unable to resolve Vite test server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => server.close(),
  };
}

async function launchBrowser() {
  if (process.env.PLAYWRIGHT_CHANNEL) {
    return await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL,
      headless: true,
    });
  }

  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (os.platform() === 'win32') {
      console.log('  Playwright Chromium is unavailable; falling back to installed Microsoft Edge.');
      return await chromium.launch({
        channel: 'msedge',
        headless: true,
      });
    }
    throw error;
  }
}

/**
 * 等待编辑器预览满足断言；超时后附带当前工作区快照，避免只得到无上下文的超时信息。
 * @param {import('playwright').Page} page Playwright 页面实例
 * @param {string} description 失败说明
 * @param {string} previewText 预览中必须出现的文字
 */
async function waitForEditorPreview(page, description, previewText) {
  try {
    await page.waitForFunction(
      (expectedText) => (document.querySelector('#editorPreview')?.textContent || '').includes(expectedText),
      previewText,
      { timeout: 10_000 },
    );
  } catch {
    const state = await page.evaluate(() => ({
      kind: document.querySelector('#editorKind')?.value,
      status: document.querySelector('#editorStatus')?.textContent,
      statusState: document.querySelector('#editorStatus')?.dataset.state,
      preview: document.querySelector('#editorPreview')?.textContent,
      source: document.querySelector('#editorSource')?.value,
    }));
    throw new Error(`${description}; editor state: ${JSON.stringify(state)}`);
  }
}

/**
 * 切回文本转换工作台；用于失败恢复，避免某个模式测试污染后续用例。
 * @param {import('playwright').Page} page Playwright 页面实例
 */
async function switchToTextWorkbench(page) {
  await page.click('.mode-btn[data-mode="text"]');
  await page.waitForSelector('#converterWorkbench:not([hidden])', { timeout: 3000 });
}

/**
 * 创建一份用于 E2E 的空白 CellCanvas draft JSON。
 *
 * 连线 smoke 需要避开内置样例中已有的 `|/-` 字符，否则测试会验证到
 * 连接位合并细节，而不是纯粹验证 Web 控件调用连线器的通路。
 *
 * @param {number} width 画布宽度。
 * @param {number} height 画布高度。
 * @returns {string} 可直接写入编辑器源码框的 JSON。
 */
function createBlankCellCanvasDraftSource(width, height) {
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push({
        x,
        y,
        char: ' ',
        width: 1,
        role: 'empty',
        sourceGlyph: null,
      });
    }
  }

  return JSON.stringify({
    schema: 'unicodeartjs-cellcanvas-document-draft@0',
    stability: 'internal-draft',
    document: {
      schema: 'unicode-art-document',
      version: 'uadm-0',
      id: 'cellcanvas-e2e-connector',
      title: 'CellCanvas E2E Connector',
      canvas: {
        width,
        height,
        unit: 'glyph-cell',
      },
      layers: [
        {
          id: 'layer-e2e-main',
          kind: 'cell-map',
          locked: false,
          visible: true,
          cellMap: {
            width,
            height,
            cells,
          },
        },
      ],
    },
    editorSession: {
      activeLayerId: 'layer-e2e-main',
      activeCell: { x: 0, y: 0 },
      selection: { kind: 'single-cell', x: 0, y: 0, width: 1, height: 1 },
      clipboard: { kind: 'empty' },
      history: { cursor: 0, entries: [] },
    },
  }, null, 2);
}

/**
 * 读取资源发现页的调试快照，方便定位远端 Pages 的短暂传播状态。
 * @param {import('playwright').Page} page Playwright 页面实例
 */
async function getResourceDiscoverySnapshot(page) {
  return await page.evaluate(() => ({
    status: document.querySelector('#resourceStatus')?.textContent || '',
    statusState: document.querySelector('#resourceStatus')?.dataset.state || '',
    count: document.querySelector('#resourceCount')?.textContent || '',
    verified: document.querySelector('#resourceVerifiedCount')?.textContent || '',
    trust: document.querySelector('#resourceTrustStatus')?.textContent || '',
    revocation: document.querySelector('#resourceRevocationStatus')?.textContent || '',
    importDisabled: document.querySelector('#resourceImportEditor')?.disabled ?? true,
    firstFailed: Array.from(document.querySelectorAll('#resourceGrid [data-resource-id]'))
      .find((node) => node.getAttribute('data-state') === 'failed')
      ?.textContent?.replace(/\s+/g, ' ').trim() || '',
    detail: document.querySelector('#resourceCheckResult')?.textContent || '',
  }));
}

//#endregion

//#region Main Flow

async function main() {
  let testServer;
  let browser;

  try {
    testServer = await createTestServer();
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    console.log('\n=== UnicodeArtJs Web E2E Smoke Tests ===');
    console.log(`   Base URL: ${testServer.baseUrl}\n`);

    await test('page loads', async () => {
      await page.goto(testServer.baseUrl, { waitUntil: 'networkidle' });
      const title = await page.title();
      if (!title.includes('UnicodeArtJs')) throw new Error(`Title mismatch: ${title}`);
    });

    await test('header exists', async () => {
      await page.waitForSelector('.logo-text', { timeout: 5000 });
      const text = await page.textContent('.logo-text');
      if (!text.includes('UnicodeArtJs')) throw new Error('Logo not found');
    });

    await test('mode buttons exist', async () => {
      const buttons = await page.$$('.mode-btn');
      if (buttons.length < 6) throw new Error('A mode button is missing');
    });

    await test('theme selector exists', async () => {
      await page.waitForSelector('#themeSelect', { timeout: 5000 });
    });

    await test('language selector switches major UI text', async () => {
      await page.waitForSelector('#languageSelect', { timeout: 5000 });
      await page.selectOption('#languageSelect', 'en-US');
      await page.waitForFunction(() => document.documentElement.lang === 'en-US');
      const englishLabel = await page.textContent('.mode-btn[data-mode="image"] .mode-text');
      if (!englishLabel.includes('Image to Art')) throw new Error('English UI label not applied');
      await page.selectOption('#languageSelect', 'zh-CN');
      await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
    });

    await test('preview exists', async () => {
      await page.waitForSelector('#artPreview', { timeout: 5000 });
    });

    await test('export buttons exist', async () => {
      const selectors = ['#exportTxt', '#exportHtml', '#exportPng', '#copyBtn'];
      for (const selector of selectors) {
        await page.waitForSelector(selector, { timeout: 3000 });
      }
    });

    await test('switches to text mode', async () => {
      const textButton = await page.$('.mode-btn[data-mode="text"]');
      if (!textButton) throw new Error('Text mode button not found');
      await textButton.click();
      await page.waitForTimeout(200);
      const isActive = await textButton.evaluate((element) => element.classList.contains('active'));
      if (!isActive) throw new Error('Text mode not activated');
    });

    await test('text input is visible', async () => {
      await page.waitForSelector('#textInput', { timeout: 3000 });
      const visible = await page.isVisible('#textInputPanel');
      if (!visible) throw new Error('Text input panel not visible');
    });

    await test('captures effective font configuration passed to Core', async () => {
      await page.evaluate(() => {
        const original = window.UnicodeArtCore.textToArt;
        window.__unicodeArtTextCallCount = 0;
        window.__unicodeArtLastTextConfig = null;
        window.UnicodeArtCore.textToArt = async (text, config) => {
          window.__unicodeArtTextCallCount += 1;
          window.__unicodeArtLastTextConfig = config;
          return original(text, config);
        };
      });
    });

    await test('generates text banner preview', async () => {
      await page.fill('#textInput', 'UnicodeArtJs');
      await page.waitForFunction(() => {
        const text = document.querySelector('#artPreview')?.textContent || '';
        return text.trim().length > 40
          && text.split('\n').length > 2
          && !/请输入|Please enter|预览区域|preview/i.test(text);
      }, { timeout: 10000 });

      const selectedGlyphFont = await page.inputValue('#glyphFont');
      const effectiveGlyphFont = await page.evaluate(() => window.__unicodeArtLastTextConfig?.glyphFontFamily);
      if (effectiveGlyphFont !== selectedGlyphFont) {
        throw new Error('Initial glyph font does not match the value passed to Core');
      }
    });

    await test('effective conversion settings regenerate text output', async () => {
      const waitForRegeneration = async (before) => {
        await page.waitForFunction((previous) => window.__unicodeArtTextCallCount > previous, before, { timeout: 10000 });
      };

      let before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.selectOption('#font', "'LXGW WenKai', '霞鹜文楷', serif");
      await waitForRegeneration(before);
      const visualFont = await page.evaluate(() => window.__unicodeArtLastTextConfig?.visualFont?.family);
      if (visualFont !== "'LXGW WenKai', '霞鹜文楷', serif") throw new Error('Visual font was not passed to Core');

      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.selectOption('#glyphFont', "'LXGW WenKai Mono', '霞鹜文楷等宽', 'LXGW WenKai', '霞鹜文楷', monospace");
      await waitForRegeneration(before);
      const glyph = await page.evaluate(() => ({
        configured: window.__unicodeArtLastTextConfig?.glyphFontFamily,
        computed: getComputedStyle(document.querySelector('#artPreview')).fontFamily,
      }));
      if (glyph.configured !== "'LXGW WenKai Mono', '霞鹜文楷等宽', 'LXGW WenKai', '霞鹜文楷', monospace") {
        throw new Error('Glyph font was not passed to Core');
      }
      if (!glyph.computed.includes('LXGW WenKai Mono')) {
        throw new Error('Glyph preview CSS was not updated');
      }

      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.fill('#height', '13');
      await waitForRegeneration(before);
      const height = await page.evaluate(() => window.__unicodeArtLastTextConfig?.height);
      if (height !== 13) throw new Error('Height was not passed to regenerated config');

      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.fill('#width', '72');
      await waitForRegeneration(before);
      const width = await page.evaluate(() => window.__unicodeArtLastTextConfig?.width);
      if (width !== 72) throw new Error('Width was not passed to regenerated config');

      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.click('#boxEnabled');
      await waitForRegeneration(before);
      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.fill('#boxPadding', '0');
      await waitForRegeneration(before);
      const padding = await page.evaluate(() => window.__unicodeArtLastTextConfig?.box?.padding);
      if (padding !== 0) throw new Error('Box padding 0 was not passed to Core');
    });

    await test('font availability status is shown and refreshes', async () => {
      await page.waitForSelector('#fontStatus[data-state]', { timeout: 5000 });
      await page.waitForSelector('#glyphFontStatus[data-state]', { timeout: 5000 });
      const initial = await page.evaluate(() => ({
        visual: document.querySelector('#fontStatus')?.textContent?.trim(),
        visualState: document.querySelector('#fontStatus')?.dataset.state,
        glyph: document.querySelector('#glyphFontStatus')?.textContent?.trim(),
        glyphState: document.querySelector('#glyphFontStatus')?.dataset.state,
      }));
      if (!initial.visual || !initial.visualState) throw new Error('Visual font status is empty');
      if (!initial.glyph || !initial.glyphState) throw new Error('Glyph font status is empty');

      await page.selectOption('#glyphFont', 'monospace');
      await page.waitForFunction(() => document.querySelector('#glyphFontStatus')?.dataset.state === 'info');
      const genericText = await page.textContent('#glyphFontStatus');
      if (!/fallback|通用/.test(genericText || '')) throw new Error('Generic glyph font status was not shown');
    });

    await test('switches back to image mode', async () => {
      const imageButton = await page.$('.mode-btn[data-mode="image"]');
      if (!imageButton) throw new Error('Image mode button not found');
      await imageButton.click();
      await page.waitForTimeout(200);
      const visible = await page.isVisible('#imageInputPanel');
      if (!visible) throw new Error('Image input panel not visible');
    });

    await test('height input can be changed', async () => {
      await page.fill('#height', '25');
      const value = await page.inputValue('#height');
      if (value !== '25') throw new Error('Height not updated');
    });

    await test('charset selector can be changed', async () => {
      await page.selectOption('#charset', 'EXTENDED');
      const value = await page.inputValue('#charset');
      if (value !== 'EXTENDED') throw new Error('Charset not updated');
    });

    await test('glyph font selector can be changed', async () => {
      await page.selectOption('#glyphFont', "'Sarasa Mono SC', 'Sarasa Term SC', '等距更纱黑体 SC Nerd Font', '等距更纱黑体 SC', '等距更纱黑体', '等距更紗黑體 SC', monospace");
      await page.waitForTimeout(100);
    });

    await test('char spacing and glyph width controls exist', async () => {
      await page.locator('details.config-details').evaluate((element) => { element.open = true; });
      await page.fill('#charSpace', '2');
      const charSpace = await page.inputValue('#charSpace');
      if (charSpace !== '2') throw new Error('Char spacing not updated');

      await page.selectOption('#glyphWidthProfile', 'custom');
      const regexVisible = await page.isVisible('#wideCharRegexGroup');
      if (!regexVisible) throw new Error('Wide char regex field not shown');
      await page.fill('#wideCharRegex', '[\\u4e00-\\u9fff]');
    });

    await test('upload zone is keyboard accessible', async () => {
      const role = await page.getAttribute('#uploadZone', 'role');
      const tabindex = await page.getAttribute('#uploadZone', 'tabindex');
      if (role !== 'button' || tabindex !== '0') {
        throw new Error('Upload zone is not exposed as a keyboard button');
      }
    });

    await test('switches to dark theme', async () => {
      await page.selectOption('#themeSelect', 'dark');
      await page.waitForTimeout(300);
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (theme !== 'dark') throw new Error('Theme not dark');
    });

    await test('switches back to default theme', async () => {
      await page.selectOption('#themeSelect', 'default');
      await page.waitForTimeout(300);
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (theme !== null) throw new Error('Theme not default');
    });

    await test('migrates legacy theme storage into unified config', async () => {
      const isolatedContext = await browser.newContext();
      const migrationPage = await isolatedContext.newPage();
      try {
        await migrationPage.goto(testServer.baseUrl, { waitUntil: 'networkidle' });
        await migrationPage.evaluate(() => {
          localStorage.clear();
          localStorage.setItem('unicode-art-theme', 'dark');
        });
        await migrationPage.reload({ waitUntil: 'networkidle' });

        const migrated = await migrationPage.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          selected: document.querySelector('#themeSelect')?.value,
          legacy: localStorage.getItem('unicode-art-theme'),
          config: JSON.parse(localStorage.getItem('unicode-art-config') || '{}').themeName,
        }));
        if (migrated.theme !== 'dark' || migrated.selected !== 'dark') {
          throw new Error('Legacy theme was not applied consistently');
        }
        if (migrated.legacy !== null || migrated.config !== 'dark') {
          throw new Error('Legacy theme was not migrated to unified config');
        }
      } finally {
        await isolatedContext.close();
      }
    });

    await test('loads public developer documentation entries', async () => {
      await page.click('.mode-btn[data-mode="docs"]');
      await page.waitForSelector('#docsWorkbench:not([hidden])', { timeout: 5000 });
      await page.waitForFunction(
        () => document.querySelectorAll('#docsGrid [data-docs-entry-id]').length === 4,
        undefined,
        { timeout: 10_000 },
      );
      await page.waitForFunction(
        () => document.querySelectorAll('#docsSections [data-docs-section-id]').length === 8,
        undefined,
        { timeout: 10_000 },
      );
      const docsState = await page.evaluate(() => ({
        count: document.querySelector('#docsEntryCount')?.textContent,
        sectionCount: document.querySelector('#docsSectionCount')?.textContent,
        title: document.querySelector('#docsTitle')?.textContent,
        guideHref: document.querySelector('#docsGuideLink')?.getAttribute('href'),
        symbolCount: document.querySelectorAll('#docsSymbols [data-docs-symbol-id]').length,
        firstSymbolHref: document.querySelector('#docsSymbols [data-docs-symbol-id]')?.getAttribute('href'),
        symbolText: document.querySelector('#docsSymbols')?.textContent || '',
        pageText: document.querySelector('#docsWorkbench')?.textContent || '',
      }));
      if (docsState.count !== '4') throw new Error('Public docs entry count changed');
      if (docsState.sectionCount !== '8') throw new Error('Public docs section count changed');
      if (!docsState.title?.includes('Core')) throw new Error('Default docs entry was not selected');
      if (docsState.symbolCount < 80) throw new Error('Core API symbol index was not rendered');
      if (!docsState.symbolText.includes('textToArt')) throw new Error('Core API symbol index does not include textToArt');
      if (!docsState.firstSymbolHref?.startsWith('https://github.com/mandolin/UnicodeArtJs/')) {
        throw new Error('API symbol source link does not point to the public repository');
      }
      if (!docsState.guideHref?.startsWith('https://github.com/mandolin/UnicodeArtJs/')) {
        throw new Error('Docs guide link does not point to the public repository');
      }
      if (/work-zone|\.generated-docs|ai\/codex/i.test(docsState.pageText)) {
        throw new Error('Docs page leaked an internal path fragment');
      }
      await page.click('[data-docs-section-id="quickstart"]');
      const sectionState = await page.evaluate(() => ({
        title: document.querySelector('#docsTitle')?.textContent,
        metrics: document.querySelector('#docsMetrics')?.textContent || '',
        guideHref: document.querySelector('#docsGuideLink')?.getAttribute('href'),
        symbolCount: document.querySelectorAll('#docsSymbols [data-docs-symbol-id]').length,
      }));
      if (!sectionState.title?.includes('Quickstart')) throw new Error('Docs section selection did not render Quickstart');
      if (!sectionState.metrics.includes('README.md')) throw new Error('Docs section did not list public docs');
      if (sectionState.symbolCount !== 0) throw new Error('Docs section should not keep API symbols selected');
      if (!sectionState.guideHref?.startsWith('https://github.com/mandolin/UnicodeArtJs/')) {
        throw new Error('Docs section guide link does not point to the public repository');
      }

      await page.selectOption('#languageSelect', 'en-US');
      await page.waitForFunction(() => document.querySelector('.mode-btn[data-mode="docs"] .mode-text')?.textContent === 'Developer Docs');
      await page.selectOption('#languageSelect', 'zh-CN');
      await page.click('.mode-btn[data-mode="text"]');
      await page.waitForSelector('#converterWorkbench:not([hidden])', { timeout: 3000 });
    });

    await test('loads resource discovery manifest and supports confirmed editor import', async () => {
      try {
        await page.click('.mode-btn[data-mode="resources"]');
        await page.waitForSelector('#resourceWorkbench:not([hidden])', { timeout: 5000 });
        await page.waitForFunction(
          () => document.querySelectorAll('#resourceGrid [data-resource-id]').length >= 5,
          undefined,
          { timeout: 10_000 },
        );
        try {
          await page.waitForFunction(
            () => document.querySelector('#resourceStatus')?.dataset.state === 'success',
            undefined,
            { timeout: 10_000 },
          );
        } catch (error) {
          const snapshot = await getResourceDiscoverySnapshot(page);
          throw new Error(`${error.message}; resource snapshot: ${JSON.stringify(snapshot)}`);
        }

        const state = await page.evaluate(() => ({
          count: Number(document.querySelector('#resourceCount')?.textContent || 0),
          verified: Number(document.querySelector('#resourceVerifiedCount')?.textContent || 0),
          network: document.querySelector('#resourceNetwork')?.textContent,
          autoInstall: document.querySelector('#resourceAutomaticInstall')?.textContent,
          badge: document.querySelector('#resourceBadge')?.dataset.state,
          trust: document.querySelector('#resourceTrustStatus')?.textContent,
          revocation: document.querySelector('#resourceRevocationStatus')?.textContent,
          importDisabled: document.querySelector('#resourceImportEditor')?.disabled,
          check: document.querySelector('#resourceCheckResult')?.textContent || '',
          pageText: document.querySelector('#resourceWorkbench')?.textContent || '',
        }));
        if (state.count < 5 || state.verified !== state.count) {
          throw new Error('Resource discovery did not verify all static resources');
        }
        if (!/无|None/.test(state.network || '') || !/关闭|Off/.test(state.autoInstall || '')) {
          throw new Error('Resource discovery boundary flags were not rendered');
        }
        if (state.badge !== 'verified' || !/sha256|size/.test(state.check)) {
          throw new Error('Resource discovery detail verification was not rendered');
        }
        if (!/维护者|Maintainer/i.test(state.trust || '') || !/未撤回|Not revoked/i.test(state.revocation || '')) {
          throw new Error('Resource discovery trust and revocation status were not rendered');
        }
        if (state.importDisabled) {
          throw new Error('Resource discovery did not enable confirmed import for a signed resource');
        }
        if (!/不自动安装|no automatic install|确认|confirmation/i.test(state.pageText)) {
          throw new Error('Resource discovery page did not expose the confirmation boundary');
        }

        await page.click('[data-resource-id="review-workflow"]');
        await page.waitForFunction(
          () => (document.querySelector('#resourceId')?.textContent || '') === 'review-workflow',
          undefined,
          { timeout: 5000 },
        );
        await page.click('#resourceImportEditor');
        await page.waitForSelector('#resourceImportDialog[open]', { timeout: 3000 });
        await page.click('#resourceImportCancel');
        await page.waitForFunction(
          () => !document.querySelector('#resourceImportDialog')?.open,
          undefined,
          { timeout: 3000 },
        );
        await page.waitForSelector('#resourceWorkbench:not([hidden])', { timeout: 3000 });

        await page.click('#resourceImportEditor');
        await page.waitForSelector('#resourceImportDialog[open]', { timeout: 3000 });
        await page.click('#resourceImportConfirm');
        await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 5000 });
        await page.waitForFunction(
          () => (document.querySelector('#editorSource')?.value || '').includes('Gallery Review Workflow'),
          undefined,
          { timeout: 5000 },
        );

        await page.click('.mode-btn[data-mode="resources"]');
        await page.waitForSelector('#resourceWorkbench:not([hidden])', { timeout: 5000 });
        await page.click('#resourceOpenGallery');
        await page.waitForSelector('#galleryWorkbench:not([hidden])', { timeout: 5000 });
        await page.waitForFunction(
          () => document.querySelector('[data-gallery-artwork-id="review-workflow"]')?.classList.contains('selected'),
          undefined,
          { timeout: 10_000 },
        );
      } finally {
        try {
          await switchToTextWorkbench(page);
        } catch {
          // 失败恢复不能覆盖原始断言错误。
        }
      }
    });

    await test('box panel toggle works', async () => {
      await switchToTextWorkbench(page);
      const checked = await page.isChecked('#boxEnabled');
      if (!checked) throw new Error('Box not enabled');
      await page.click('#boxEnabled');
    });

    await test('advanced settings panel exists', async () => {
      const details = await page.$('details.config-details');
      if (!details) throw new Error('Advanced settings details not found');
    });

    await test('opens the source-first editor workspace', async () => {
      await page.click('.mode-btn[data-mode="editor"]');
      await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 3000 });
      const state = await page.evaluate(() => ({
        active: document.querySelector('.mode-btn[data-mode="editor"]')?.classList.contains('active'),
        converterHidden: document.querySelector('#converterWorkbench')?.hidden,
        converterDisplay: getComputedStyle(document.querySelector('#converterWorkbench')).display,
        source: document.querySelector('#editorSource')?.value,
      }));
      if (!state.active || !state.converterHidden || state.converterDisplay !== 'none' || !state.source?.includes('"version": 1')) {
        throw new Error('Editor workspace did not become active with a canonical source');
      }
    });

    await test('localizes editor controls and exposes preview region semantics', async () => {
      await page.selectOption('#languageSelect', 'en-US');
      await page.waitForFunction(() => document.querySelector('#editorKind option[value="document"]')?.textContent === 'Layout document');
      const regionLabel = await page.getAttribute('.editor-preview-container', 'aria-label');
      if (regionLabel !== 'Editor preview') throw new Error('Editor preview region was not localized');
      await page.selectOption('#languageSelect', 'zh-CN');
      await page.waitForFunction(() => document.querySelector('#editorKind option[value="document"]')?.textContent === '布局文档');
    });

    await test('uses Studio resource entry proposal before editor import', async () => {
      await page.click('.mode-btn[data-mode="editor"]');
      await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 5000 });
      const before = await page.inputValue('#editorSource');
      await page.click('#editorResourceEntryLoad');
      await page.waitForFunction(
        () => document.querySelectorAll('#editorResourceEntrySelect option').length >= 1
          && !document.querySelector('#editorResourceEntrySelect')?.disabled,
        undefined,
        { timeout: 10_000 },
      );
      await page.selectOption('#editorResourceEntrySelect', 'review-workflow');
      await page.click('#editorResourceEntryInspect');
      await page.waitForFunction(
        () => (document.querySelector('#editorResourceEntryProposal')?.textContent || '').includes('targetScope: editor-session-preview'),
        undefined,
        { timeout: 5000 },
      );
      const proposalState = await page.evaluate(() => ({
        status: document.querySelector('#editorResourceEntryStatus')?.textContent || '',
        proposal: document.querySelector('#editorResourceEntryProposal')?.textContent || '',
        importDisabled: document.querySelector('#editorResourceEntryImport')?.disabled ?? true,
      }));
      if (proposalState.importDisabled) throw new Error('Studio resource proposal did not enable confirmed import');
      if (!proposalState.proposal.includes('confirmedByDefault: false')) {
        throw new Error('Studio resource proposal did not expose manual confirmation boundary');
      }

      await page.click('#editorResourceEntryImport');
      await page.waitForSelector('#resourceImportDialog[open]', { timeout: 3000 });
      await page.click('#resourceImportCancel');
      await page.waitForFunction(
        () => !document.querySelector('#resourceImportDialog')?.open,
        undefined,
        { timeout: 3000 },
      );
      const afterCancel = await page.inputValue('#editorSource');
      if (afterCancel !== before) throw new Error('Canceled Studio resource import changed the editor source');

      await page.click('#editorResourceEntryImport');
      await page.waitForSelector('#resourceImportDialog[open]', { timeout: 3000 });
      await page.click('#resourceImportConfirm');
      await page.waitForFunction(
        () => (document.querySelector('#editorSource')?.value || '').includes('Gallery Review Workflow')
          && (document.querySelector('#editorResourceEntryStatus')?.dataset.state === 'success'),
        undefined,
        { timeout: 5000 },
      );
    });

    await test('previews deterministic Studio AI proposal without rewriting source', async () => {
      await page.click('.mode-btn[data-mode="editor"]');
      await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 5000 });
      await page.selectOption('#editorKind', 'cellcanvas');
      await page.waitForFunction(() => document.querySelector('#editorKind')?.value === 'cellcanvas');
      await page.click('#editorLoadPreset');
      await page.waitForSelector('#editorAiProposalSection:not([hidden])', { timeout: 3000 });
      const before = await page.inputValue('#editorSource');
      await page.locator('#editorAiPrompt').scrollIntoViewIfNeeded();
      await page.fill('#editorAiPrompt', '标题强化');
      await page.click('#editorAiGenerate');
      await page.waitForFunction(
        () => (document.querySelector('#editorAiProposalPreview')?.textContent || '').includes('preflightStatus: host-check-required'),
        undefined,
        { timeout: 5000 },
      );
      const proposalState = await page.evaluate(() => ({
        status: document.querySelector('#editorAiStatus')?.textContent || '',
        preview: document.querySelector('#editorAiProposalPreview')?.textContent || '',
        acceptDisabled: document.querySelector('#editorAiAccept')?.disabled ?? true,
      }));
      if (proposalState.acceptDisabled) throw new Error('AI proposal preview did not enable accept review action');
      if (!proposalState.preview.includes('provider: deterministic-mock')) {
        throw new Error('AI proposal preview did not use deterministic mock provider');
      }
      if (!proposalState.preview.includes('sourcesContentAllowed: false')) {
        throw new Error('AI proposal preview did not expose sourcesContent boundary');
      }

      await page.click('#editorAiAccept');
      await page.waitForFunction(
        () => (document.querySelector('#editorAiProposalPreview')?.textContent || '').includes('status: host-checked-apply-required'),
        undefined,
        { timeout: 3000 },
      );
      const afterAccept = await page.inputValue('#editorSource');
      if (afterAccept !== before) throw new Error('Accepted AI proposal rewrote the CellCanvas source');

      await page.click('#editorAiReject');
      await page.waitForFunction(
        () => (document.querySelector('#editorAiProposalPreview')?.textContent || '').includes('status: rejected'),
        undefined,
        { timeout: 3000 },
      );
    });

    await test('runs Studio benchmark diagnostics from CellCanvas staging shell', async () => {
      await page.click('.mode-btn[data-mode="editor"]');
      await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 5000 });
      await page.selectOption('#editorKind', 'cellcanvas');
      await page.waitForSelector('#editorDiagnosticsSection:not([hidden])', { timeout: 3000 });
      await page.selectOption('#editorBenchmarkPreset', 'large');
      await page.locator('#editorBenchmarkRun').scrollIntoViewIfNeeded();
      await page.click('#editorBenchmarkRun');
      await page.waitForFunction(
        () => (document.querySelector('#editorBenchmarkReport')?.textContent || '').includes('thresholdStatus:'),
        undefined,
        { timeout: 5000 },
      );
      const benchmarkState = await page.evaluate(() => ({
        status: document.querySelector('#editorBenchmarkStatus')?.textContent || '',
        state: document.querySelector('#editorBenchmarkStatus')?.dataset.state || '',
        report: document.querySelector('#editorBenchmarkReport')?.textContent || '',
      }));

      if (!benchmarkState.report.includes('rendererIsSourceModel: false')) {
        throw new Error('Studio benchmark did not report renderer projection boundary');
      }
      if (!benchmarkState.report.includes('virtualGrid:')) {
        throw new Error('Studio benchmark did not include Virtual Grid metrics');
      }
      if (!benchmarkState.report.includes('canvas2d:')) {
        throw new Error('Studio benchmark did not include Canvas 2D metrics');
      }
      if (!['success', 'warning'].includes(benchmarkState.state)) {
        throw new Error(`Studio benchmark status was not completed: ${benchmarkState.status}`);
      }
    });

    await test('inspects a declaration-only extension manifest without loading resources', async () => {
      const manifest = {
        format: 'unicode-art-extension',
        version: 1,
        meta: {
          id: 'org.unicodeartjs.web-e2e-extension',
          name: 'Web E2E Extension',
          authors: ['UnicodeArtJs'],
          license: { expression: 'MIT', origin: 'original' },
        },
        capabilities: ['semantic-document'],
        compatibility: { minCoreVersion: '1.2.1', targets: ['web'] },
        resources: [
          {
            id: 'document',
            kind: 'semantic-document',
            path: 'assets/template.uadoc.json',
          },
        ],
      };
      await page.setInputFiles('#editorExtensionFile', {
        name: 'unicode-art-extension.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(manifest), 'utf8'),
      });
      await page.waitForFunction(
        () => document.querySelector('#editorExtensionStatus')?.dataset.state === 'success',
        undefined,
        { timeout: 5000 },
      );
      const status = await page.textContent('#editorExtensionStatus');
      if (!status.includes('Web E2E Extension') || !status.includes('兼容')) {
        throw new Error('Extension manifest did not report a compatible Web inspection');
      }
    });

    await test('renders and validates a semantic document from editor source', async () => {
      await page.selectOption('#editorKind', 'document');
      await page.click('#editorLoadPreset');
      await page.click('#editorValidate');
      await page.waitForFunction(
        () => document.querySelector('#editorStatus')?.dataset.state === 'success',
        undefined,
        { timeout: 10_000 },
      );
      await page.click('#editorRender');
      await waitForEditorPreview(page, 'Semantic document preview did not render', 'UnicodeArtJs');
    });

    await test('saves and restores a local semantic template', async () => {
      await page.fill('#editorTemplateName', 'P3.4 E2E document');
      await page.click('#editorSaveTemplate');
      await page.waitForFunction(() => {
        const status = document.querySelector('#editorStatus')?.textContent || '';
        return status.includes('保存') || status.includes('saved');
      });
      const option = await page.$eval('#editorSavedTemplate', (select) => (
        Array.from(select.options).some((item) => item.textContent === 'P3.4 E2E document')
      ));
      if (!option) throw new Error('Local editor template was not added to the selector');
      await page.selectOption('#editorSavedTemplate', { label: 'P3.4 E2E document' });
      await page.click('#editorLoadTemplate');
      const source = await page.inputValue('#editorSource');
      if (!source.includes('UnicodeArtJs')) throw new Error('Saved semantic template was not restored');
    });

    await test('renders a UAF font and can embed it back into a semantic document', async () => {
      await page.selectOption('#editorKind', 'font');
      await page.waitForSelector('#editorFontOptions:not([hidden])', { timeout: 3000 });
      await page.click('#editorLoadPreset');
      await page.fill('#editorFontSample', 'A?');
      await page.click('#editorRender');
      await waitForEditorPreview(page, 'UAF font preview did not render', '???');
      await page.click('#editorEmbedFont');
      await page.waitForFunction(() => document.querySelector('#editorKind')?.value === 'document');
      const source = await page.inputValue('#editorSource');
      if (!source.includes('"art-font-text"')) throw new Error('Embedded document source is missing art-font-text');
    });

    await test('renders and edits a CellCanvas fixed grid alpha draft', async () => {
      await page.selectOption('#editorKind', 'cellcanvas');
      await page.waitForSelector('#editorCellCanvasOptions:not([hidden])', { timeout: 3000 });
      await page.click('#editorLoadPreset');
      await page.click('#editorRender');
      await page.waitForSelector('[data-cellcanvas-grid][data-cellcanvas-width="8"][data-cellcanvas-height="2"]', {
        timeout: 5000,
      });

      const readFirstCellCanvasLine = async () => await page.$$eval(
        '[data-cellcanvas-cell]',
        (cells) => cells.slice(0, 8).map((cell) => (
          cell.textContent === '\u00a0' ? ' ' : cell.textContent
        )).join(''),
      );
      const before = await readFirstCellCanvasLine();
      if (before !== '|| /\\ _|') throw new Error('CellCanvas preset text was not rendered');

      await page.click('[data-cellcanvas-x="0"][data-cellcanvas-y="0"]');
      await page.fill('#editorCellCanvasChar', '#');
      await page.click('#editorCellCanvasApply');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="0"][data-cellcanvas-y="0"]')?.textContent === '#'
      ));

      const after = await readFirstCellCanvasLine();
      const source = await page.inputValue('#editorSource');
      if (after !== '#| /\\ _|') throw new Error('CellCanvas single-cell preview did not update');
      if (!source.includes('"char": "#"')) throw new Error('CellCanvas draft source did not persist the cell edit');
    });

    await test('supports CellCanvas rectangle selection clipboard and history', async () => {
      await page.selectOption('#editorKind', 'cellcanvas');
      await page.click('#editorLoadPreset');
      await page.click('#editorRender');
      await page.waitForSelector('[data-cellcanvas-grid]', { timeout: 5000 });

      await page.fill('#editorCellCanvasSelectX', '0');
      await page.fill('#editorCellCanvasSelectY', '0');
      await page.fill('#editorCellCanvasSelectWidth', '2');
      await page.fill('#editorCellCanvasSelectHeight', '1');
      await page.click('#editorCellCanvasSelect');
      await page.waitForFunction(() => document.querySelectorAll('.cellcanvas-cell.is-selected').length === 2);

      await page.click('#editorCellCanvasCopy');
      await page.fill('#editorCellCanvasSelectX', '2');
      await page.fill('#editorCellCanvasSelectY', '0');
      await page.click('#editorCellCanvasSelect');
      await page.click('#editorCellCanvasPaste');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="2"][data-cellcanvas-y="0"]')?.textContent === '|'
        && document.querySelector('[data-cellcanvas-x="3"][data-cellcanvas-y="0"]')?.textContent === '|'
      ));

      await page.click('#editorCellCanvasUndo');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="2"][data-cellcanvas-y="0"]')?.textContent === '\u00a0'
        && document.querySelector('[data-cellcanvas-x="3"][data-cellcanvas-y="0"]')?.textContent === '/'
      ));

      await page.click('#editorCellCanvasRedo');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="2"][data-cellcanvas-y="0"]')?.textContent === '|'
        && document.querySelector('[data-cellcanvas-x="3"][data-cellcanvas-y="0"]')?.textContent === '|'
      ));

      const source = await page.inputValue('#editorSource');
      if (!source.includes('"kind": "paste-selection"')) throw new Error('CellCanvas history did not record paste operation');
    });

    await test('draws a CellCanvas connector and keeps history reversible', async () => {
      await page.selectOption('#editorKind', 'cellcanvas');
      await page.fill('#editorSource', createBlankCellCanvasDraftSource(5, 2));
      await page.click('#editorRender');
      await page.waitForSelector('[data-cellcanvas-grid][data-cellcanvas-width="5"][data-cellcanvas-height="2"]', {
        timeout: 5000,
      });

      await page.fill('#editorCellCanvasLineFromX', '0');
      await page.fill('#editorCellCanvasLineFromY', '0');
      await page.fill('#editorCellCanvasLineToX', '4');
      await page.fill('#editorCellCanvasLineToY', '1');
      await page.selectOption('#editorCellCanvasLineRoute', 'horizontal-first');
      await page.click('#editorCellCanvasDrawLine');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="4"][data-cellcanvas-y="0"]')?.textContent === '┐'
        && document.querySelector('[data-cellcanvas-x="4"][data-cellcanvas-y="1"]')?.textContent === '│'
      ));
      let source = await page.inputValue('#editorSource');
      if (!source.includes('"kind": "draw-connector"')) {
        throw new Error('CellCanvas connector history was not recorded');
      }

      await page.click('#editorCellCanvasUndo');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="0"][data-cellcanvas-y="0"]')?.textContent === '\u00a0'
      ));
      await page.click('#editorCellCanvasRedo');
      await page.waitForFunction(() => (
        document.querySelector('[data-cellcanvas-x="0"][data-cellcanvas-y="0"]')?.textContent === '─'
      ));
      source = await page.inputValue('#editorSource');
      if (!source.includes('"char": "┐"')) throw new Error('CellCanvas connector corner was not persisted');
    });

    await test('imports SpecialArtResult into CellCanvas and exports projections', async () => {
      const specialArtFixture = {
        schema: 'unicodeartjs-special-art-e2e-wrapper@0',
        stage: 'W-art-P15.e2e',
        result: {
          schema: 'unicodeartjs-special-art-result@0',
          status: 'ok',
          cellMap: {
            width: 3,
            height: 2,
            cells: [
              [
                { char: 'U', width: 1, role: 'text', sourceGlyph: 'glyph:U' },
                { char: 'A', width: 1, role: 'text', sourceGlyph: 'glyph:A' },
                { char: 'J', width: 1, role: 'text', sourceGlyph: 'glyph:J' },
              ],
              [
                { char: '.', width: 1, role: 'effect', sourceEffect: 'shadow-textfx' },
                { char: '.', width: 1, role: 'effect', sourceEffect: 'shadow-textfx' },
                { char: '.', width: 1, role: 'effect', sourceEffect: 'shadow-textfx' },
              ],
            ],
          },
          plainTextPreview: 'SHOULD_NOT_BE_INPUT',
          specialArt: { engineId: 'special-art-e2e', inputText: 'UAJ' },
          diagnostics: [{ code: 'UA_E2E_SPECIAL_ART', severity: 'info', message: 'ok' }],
        },
      };

      await page.setInputFiles('#editorImportFile', {
        name: 'special-art-e2e-result.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(specialArtFixture), 'utf8'),
      });
      await page.waitForFunction(
        () => document.querySelector('#editorKind')?.value === 'cellcanvas'
          && document.querySelector('#editorStatus')?.dataset.state === 'success',
        undefined,
        { timeout: 5000 },
      );
      await page.click('#editorRender');
      await page.waitForSelector('[data-cellcanvas-grid][data-cellcanvas-width="3"][data-cellcanvas-height="2"]', {
        timeout: 5000,
      });

      const source = await page.inputValue('#editorSource');
      if (!source.includes('"plainTextPreviewUsed": false')) {
        throw new Error('SpecialArt import did not record the canonical CellMap boundary');
      }
      if (!source.includes('UA_CELLCANVAS_SPECIAL_ART_IMPORTED')) {
        throw new Error('SpecialArt import diagnostic was not recorded');
      }

      const txtDownload = page.waitForEvent('download');
      await page.click('#editorCellCanvasExportTxt');
      const txtFile = await txtDownload;
      if (txtFile.suggestedFilename() !== 'unicode-art-cellcanvas.txt') {
        throw new Error(`Unexpected CellCanvas TXT filename: ${txtFile.suggestedFilename()}`);
      }

      const htmlDownload = page.waitForEvent('download');
      await page.click('#editorCellCanvasExportHtml');
      const htmlFile = await htmlDownload;
      if (htmlFile.suggestedFilename() !== 'unicode-art-cellcanvas.html') {
        throw new Error(`Unexpected CellCanvas HTML filename: ${htmlFile.suggestedFilename()}`);
      }

      const pngDownload = page.waitForEvent('download');
      await page.click('#editorCellCanvasExportPng');
      const pngFile = await pngDownload;
      if (pngFile.suggestedFilename() !== 'unicode-art-cellcanvas.png') {
        throw new Error(`Unexpected CellCanvas PNG filename: ${pngFile.suggestedFilename()}`);
      }

      const projectDownload = page.waitForEvent('download');
      await page.click('#editorCellCanvasSaveProject');
      const projectFile = await projectDownload;
      if (projectFile.suggestedFilename() !== 'unicode-art-studio.uart-project.json') {
        throw new Error(`Unexpected CellCanvas project filename: ${projectFile.suggestedFilename()}`);
      }
      const projectPath = await projectFile.path();
      if (!projectPath) throw new Error('Unable to inspect the downloaded Studio project capsule');
      const projectCapsule = JSON.parse(await fs.readFile(projectPath, 'utf8'));
      if (projectCapsule.schema !== 'unicodeartjs-studio-project') {
        throw new Error(`Unexpected Studio project schema: ${projectCapsule.schema}`);
      }
      if (projectCapsule.version !== 'studio-project@0') {
        throw new Error(`Unexpected Studio project version: ${projectCapsule.version}`);
      }
      if (projectCapsule.documents?.[0]?.draft?.document?.canvas?.width !== 3) {
        throw new Error('Studio project capsule did not preserve the CellCanvas draft');
      }

      const draft = JSON.parse(await page.inputValue('#editorSource'));
      const projectEnvelope = {
        schema: 'unicodeartjs-cellcanvas-project@0',
        stability: 'internal-draft',
        version: 0,
        app: { id: 'unicodeartjs-e2e', surface: 'web-e2e', version: 'test' },
        metadata: {
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z',
          width: 3,
          height: 2,
          documents: 1,
        },
        activeDocumentId: draft.document.id,
        documents: [draft],
      };
      await page.setInputFiles('#editorCellCanvasProjectFile', {
        name: 'cellcanvas-e2e.uart.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(projectEnvelope), 'utf8'),
      });
      await page.waitForFunction(
        () => document.querySelector('#editorStatus')?.dataset.state === 'success'
          && document.querySelector('[data-cellcanvas-grid]')?.getAttribute('data-cellcanvas-width') === '3',
        undefined,
        { timeout: 5000 },
      );
    });

    await test('rejects invalid imports without replacing the current editor source', async () => {
      const before = await page.inputValue('#editorSource');
      await page.setInputFiles('#editorImportFile', {
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"version":', 'utf8'),
      });
      await page.waitForFunction(() => document.querySelector('#editorStatus')?.dataset.state === 'error');
      const after = await page.inputValue('#editorSource');
      if (after !== before) throw new Error('Invalid import replaced the editor source');
    });

    await test('exports the current canonical JSON source', async () => {
      await page.selectOption('#editorKind', 'document');
      await page.click('#editorLoadPreset');
      const download = page.waitForEvent('download');
      await page.click('#editorExport');
      const file = await download;
      if (!file.suggestedFilename().endsWith('.uadoc.json')) {
        throw new Error(`Unexpected editor export filename: ${file.suggestedFilename()}`);
      }
    });

    await test('keeps editor controls within a narrow viewport', async () => {
      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mobilePage = await mobileContext.newPage();
      try {
        await mobilePage.goto(testServer.baseUrl, { waitUntil: 'networkidle' });
        await mobilePage.click('.mode-btn[data-mode="editor"]');
        await mobilePage.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 3000 });
        const layout = await mobilePage.evaluate(() => {
          const workbench = document.querySelector('#editorWorkbench')?.getBoundingClientRect();
          const sidebar = document.querySelector('.editor-sidebar')?.getBoundingClientRect();
          const preview = document.querySelector('.editor-preview-section')?.getBoundingClientRect();
          return {
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            workbenchWidth: workbench?.width || 0,
            sidebarBottom: sidebar?.bottom || 0,
            previewTop: preview?.top || 0,
          };
        });
        if (layout.scrollWidth > layout.viewportWidth + 1) throw new Error('Editor introduced horizontal overflow on mobile');
        if (layout.workbenchWidth <= 0 || layout.previewTop < layout.sidebarBottom) {
          throw new Error('Editor did not stack source and preview panels on mobile');
        }
      } finally {
        await mobileContext.close();
      }
    });

    await test('loads reviewed static gallery assets and opens one in the editor', async () => {
      await page.click('.mode-btn[data-mode="gallery"]');
      await page.waitForSelector('#galleryWorkbench:not([hidden])', { timeout: 5000 });
      await page.waitForFunction(
        () => document.querySelectorAll('#galleryGrid [data-gallery-artwork-id]').length >= 5,
        undefined,
        { timeout: 10_000 },
      );
      await page.click('[data-gallery-artwork-id="line-banner-uaj"]');
      await page.waitForFunction(
        () => (document.querySelector('#galleryPreview')?.textContent || '').includes('/\\'),
        undefined,
        { timeout: 10_000 },
      );

      await page.fill('#gallerySearch', '双语');
      await page.waitForFunction(
        () => document.querySelectorAll('#galleryGrid [data-gallery-artwork-id]').length === 1,
        undefined,
        { timeout: 5000 },
      );
      await page.click('#galleryClearFilters');
      await page.waitForFunction(
        () => document.querySelectorAll('#galleryGrid [data-gallery-artwork-id]').length >= 5,
        undefined,
        { timeout: 5000 },
      );

      await page.fill('#gallerySearch', '审核');
      await page.waitForFunction(
        () => document.querySelectorAll('#galleryGrid [data-gallery-artwork-id]').length === 1,
        undefined,
        { timeout: 5000 },
      );
      await page.click('#galleryClearFilters');

      await page.click('#galleryOpenEditor');
      await page.waitForSelector('#editorWorkbench:not([hidden])', { timeout: 5000 });
      const source = await page.inputValue('#editorSource');
      if (!source.includes('org.unicodeartjs.gallery.line-banner')) {
        throw new Error('Reviewed gallery source was not transferred into the editor');
      }
    });

    await test('keeps the static gallery within a narrow viewport', async () => {
      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mobilePage = await mobileContext.newPage();
      try {
        await mobilePage.goto(testServer.baseUrl, { waitUntil: 'networkidle' });
        await mobilePage.click('.mode-btn[data-mode="gallery"]');
        await mobilePage.waitForSelector('#galleryWorkbench:not([hidden])', { timeout: 5000 });
        await mobilePage.waitForFunction(
          () => document.querySelectorAll('#galleryGrid [data-gallery-artwork-id]').length >= 5,
          undefined,
          { timeout: 10_000 },
        );
        const layout = await mobilePage.evaluate(() => {
          const catalog = document.querySelector('.gallery-catalog')?.getBoundingClientRect();
          const inspector = document.querySelector('.gallery-inspector')?.getBoundingClientRect();
          return {
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            catalogBottom: catalog?.bottom || 0,
            inspectorTop: inspector?.top || 0,
          };
        });
        if (layout.scrollWidth > layout.viewportWidth + 1) {
          throw new Error('Gallery introduced horizontal overflow on mobile');
        }
        if (layout.inspectorTop < layout.catalogBottom) {
          throw new Error('Gallery catalog and inspector did not stack on mobile');
        }
      } finally {
        await mobileContext.close();
      }
    });

    console.log('\n  === Summary ===');
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);

    if (failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error('E2E Test Error:', error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (testServer) await testServer.close();
  }
}

main();

//#endregion
