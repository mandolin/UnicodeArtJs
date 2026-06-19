import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

/**
 * Rollup构建配置
 * 
 * 输出三种格式：
 * - CommonJS (cjs): Node.js环境使用
 * - ES Module (esm): 现代打包工具使用
 * - UMD: 浏览器直接引用
 */
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      name: 'UnicodeArt'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'UnicodeArt',
      sourcemap: true,
      globals: {
        sharp: 'sharp',
        ndarray: 'ndarray',
        'ndarray-ops': 'ndarrayOps'
      }
    }
  ],
  // 外部依赖（不打包到bundle中）
  external: ['sharp', 'ndarray', 'ndarray-ops'],
  plugins: [
    // 解析node_modules中的模块
    resolve({
      preferBuiltins: true
    }),
    // 转换CommonJS模块为ES6
    commonjs(),
    // TypeScript编译
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist/types',
      outputToFilesystem: true
    })
  ]
};
