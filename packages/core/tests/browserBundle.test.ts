import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('browser package bundle', () => {
  test('package exports expose ./browser', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

    expect(pkg.browser).toBe('dist/browser.esm.js');
    expect(pkg.exports['./browser']).toMatchObject({
      types: './dist/types/browser.d.ts',
      import: './dist/browser.esm.js',
      require: './dist/browser.cjs.js'
    });
  });

  test('browser CJS bundle can be imported without Node rendering dependencies', () => {
    const browser = require('../dist/browser.cjs.js');

    expect(typeof browser.browserPlatformAdapter).toBe('object');
    expect(typeof browser.imageDataToArt).toBe('function');
    expect(typeof browser.imageToArt).toBe('function');
    expect(typeof browser.textToArt).toBe('function');
    expect(typeof browser.loadBrowserFont).toBe('function');
  });

  test('browser bundles do not include Node-only dependency imports', () => {
    const files = [
      join(__dirname, '..', 'dist', 'browser.cjs.js'),
      join(__dirname, '..', 'dist', 'browser.esm.js'),
      join(__dirname, '..', 'dist', 'browser.umd.js'),
      join(__dirname, '..', 'dist', 'types', 'browser.d.ts')
    ];
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(source).not.toMatch(/require\s*\(\s*['"]sharp['"]\s*\)/);
    expect(source).not.toMatch(/require\s*\(\s*['"]canvas['"]\s*\)/);
    expect(source).not.toMatch(/require\s*\(\s*['"](?:node:)?fs['"]\s*\)/);
    expect(source).not.toMatch(/from ['"]sharp['"]/);
    expect(source).not.toMatch(/from ['"]canvas['"]/);
    expect(source).not.toMatch(/from ['"](?:node:)?(?:fs|path|os|child_process)['"]/);
    expect(source).not.toMatch(/Buffer\.from/);
    expect(source).not.toMatch(/process\.argv/);
  });
});
