/**
 * GitHub Pages smoke wrapper.
 *
 * 默认检查公开站；CI 部署后会通过 BASE_URL 覆盖为本次部署地址。
 */

process.env.BASE_URL = process.env.BASE_URL || 'https://mandolin.github.io/UnicodeArtJs/';

await import('./e2e-smoke.mjs');
