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
const alias = {
  '@': path.resolve(__dirname, './src'),
  '@components': path.resolve(__dirname, './src/components'),
  '@styles': path.resolve(__dirname, './src/styles'),
  '@utils': path.resolve(__dirname, './src/utils'),
  // Core库浏览器入口别名
  'unicode-art-js': path.resolve(__dirname, '../core/dist/browser.esm.js'),
};
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
