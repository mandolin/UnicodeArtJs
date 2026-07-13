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
      if (buttons.length < 2) throw new Error('Less than 2 mode buttons');
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
      await page.selectOption('#font', 'LXGW WenKai');
      await waitForRegeneration(before);
      const visualFont = await page.evaluate(() => window.__unicodeArtLastTextConfig?.visualFont?.family);
      if (visualFont !== 'LXGW WenKai') throw new Error('Visual font was not passed to Core');

      before = await page.evaluate(() => window.__unicodeArtTextCallCount);
      await page.selectOption('#glyphFont', "'LXGW WenKai Mono', 'LXGW WenKai', monospace");
      await waitForRegeneration(before);
      const glyph = await page.evaluate(() => ({
        configured: window.__unicodeArtLastTextConfig?.glyphFontFamily,
        computed: getComputedStyle(document.querySelector('#artPreview')).fontFamily,
      }));
      if (glyph.configured !== "'LXGW WenKai Mono', 'LXGW WenKai', monospace") {
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
      await page.selectOption('#glyphFont', '\'Sarasa Mono SC\', \'Sarasa Term SC\', monospace');
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

    await test('box panel toggle works', async () => {
      const checked = await page.isChecked('#boxEnabled');
      if (!checked) throw new Error('Box not enabled');
      await page.click('#boxEnabled');
    });

    await test('advanced settings panel exists', async () => {
      const details = await page.$('details.config-details');
      if (!details) throw new Error('Advanced settings details not found');
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
