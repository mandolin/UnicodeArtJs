import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const createPlugins = ({ preferBuiltins = true } = {}) => [
  resolve({
    preferBuiltins
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist/types',
    outputToFilesystem: true
  })
];

/**
 * Rollup build configuration.
 *
 * - Main entry: Node-oriented API, preserving the existing CJS/ESM/UMD outputs.
 * - Pure entry: platform-independent API for browser adaptation and custom hosts.
 * - Browser entry: Chrome 120+ adapter plus pure APIs, without Node-only deps.
 */
export default [
  {
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
          '@napi-rs/image': 'napiRsImage',
          'node:module': 'nodeModule',
          ndarray: 'ndarray',
          'ndarray-ops': 'ndarrayOps'
        }
      }
    ],
    external: ['sharp', '@napi-rs/image', 'node:module', 'ndarray', 'ndarray-ops'],
    plugins: createPlugins()
  },
  {
    input: 'src/pure.ts',
    output: [
      {
        file: 'dist/pure.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/pure.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: ['ndarray', 'ndarray-ops'],
    plugins: createPlugins()
  },
  {
    input: 'src/browser.ts',
    output: [
      {
        file: 'dist/browser.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/browser.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/browser.umd.js',
        format: 'umd',
        name: 'UnicodeArtBrowser',
        sourcemap: true
      }
    ],
    external: ['ndarray', 'ndarray-ops'],
    plugins: createPlugins({ preferBuiltins: false })
  }
];
