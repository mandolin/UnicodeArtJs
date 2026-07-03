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

    await test('generates text banner preview', async () => {
      await page.fill('#textInput', 'UnicodeArtJs');
      await page.waitForFunction(() => {
        const text = document.querySelector('#artPreview')?.textContent || '';
        return text.trim().length > 0 && !text.includes('请输入') && !text.includes('预览区域');
      }, { timeout: 10000 });
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

    await test('box panel toggle works', async () => {
      await page.click('#boxEnabled');
      await page.waitForTimeout(200);
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
