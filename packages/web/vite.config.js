/**
 * ============================================================================
 * 🟦 Vite 构建配置
 * ============================================================================
 *
 * @module vite.config.js
 * @since 0.1.0-alpha
 * @license MIT
 * ============================================================================
 */

import { defineConfig } from 'vite';
import path from 'path';

//#region 🟩 路径别名配置
const coreBrowserEntry = path.resolve(__dirname, '../core/dist/browser.esm.js');

const alias = [
  { find: '@components', replacement: path.resolve(__dirname, './src/components') },
  { find: '@styles', replacement: path.resolve(__dirname, './src/styles') },
  { find: '@utils', replacement: path.resolve(__dirname, './src/utils') },
  { find: '@', replacement: path.resolve(__dirname, './src') },
  // 必须先匹配完整 browser 子路径，避免旧前缀 alias 生成 `browser.esm.js/browser`。
  { find: 'unicode-art-js/browser', replacement: coreBrowserEntry },
  // 兼容 Web 内已有的根包导入，始终指向已构建的浏览器入口。
  { find: 'unicode-art-js', replacement: coreBrowserEntry },
];
//#endregion

//#region 🟩 插件配置
// 未来可扩展的插件
const plugins = [
  // vitePluginXXX(),
];
//#endregion

export default defineConfig({
  // 基础路径
  base: './',

  // 路径别名
  resolve: {
    alias,
  },

  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    host: true,
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['jquery'],
          core: ['unicode-art-js'],
        },
      },
    },
  },

  // CSS配置
  css: {
    devSourcemap: true,
  },

  // 插件
  plugins,

  // 预览配置
  preview: {
    port: 4173,
  },
});
