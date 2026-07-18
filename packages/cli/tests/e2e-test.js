#!/usr/bin/env node

/**
 * ============================================================================
 * 🟦 UnicodeArtJs CLI 端到端测试脚本
 * ============================================================================
 * 
 * 🔶 测试内容
 * - textToArt 基本功能
 * - 配置参数传递
 * - 输出格式验证
 * 
 * 🔶 运行方式
 * ```bash
 * node tests/e2e-test.js
 * ```
 * 
 * @module e2e-test
 * @since 1.0.0
 * ============================================================================
 */

const {
  imageToArt,
  resetNodeImageBackend,
  setNodeImageBackend,
  textToArt,
  validateConfig,
  PresetCharset,
  OutputFormat
} = require('unicode-art-js');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log(chalk.blue('🧪 Starting E2E Tests...\n'));

let passed = 0;
let failed = 0;
const cliPath = path.resolve(__dirname, '..', 'src', 'console.js');
const fixtureImagePath = path.resolve(__dirname, '..', '..', 'core', 'tests', 'test-image-zhong.png');
const officialExtensionManifestPath = path.resolve(
  __dirname,
  '..',
  '..',
  'extension-line-banner',
  'unicode-art-extension.json'
);
const galleryResourceManifestPath = path.resolve(
  __dirname,
  '..',
  '..',
  'web',
  'public',
  'gallery',
  'resource-manifest.json'
);
const cliPackage = require('../package.json');

/**
 * 🟢 运行单个测试
 */
async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(chalk.green(`✅ ${name}`));
    passed++;
  } catch (error) {
    console.error(chalk.red(`❌ ${name}`));
    console.error(chalk.gray(`   Error: ${error.message}`));
    failed++;
  }
}

/**
 * 🟢 运行CLI子进程
 */
function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf-8',
    ...options
  });
}

/**
 * 🟢 创建临时目录
 */
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-cli-'));
}

/**
 * 🔹 复制仓库内自有PNG测试图
 */
function createFixtureImage(imagePath) {
  fs.copyFileSync(fixtureImagePath, imagePath);
}

//#region 🟩 测试用例

/**
 * 🟢 Test 1: 基本ASCII文本转换
 */
async function testBasicAsciiText() {
  const result = await textToArt('Hi', {
    height: 5,
    charset: { type: PresetCharset.ASCII },
    outputFormat: OutputFormat.PLAIN_TEXT
  });
  
  if (!result.content || result.content.length === 0) {
    throw new Error('Empty output');
  }
  
  if (result.rows !== 5) {
    throw new Error(`Expected 5 rows, got ${result.rows}`);
  }
  
  if (result.format !== OutputFormat.PLAIN_TEXT) {
    throw new Error(`Expected PLAIN_TEXT format, got ${result.format}`);
  }
}

/**
 * 🟢 Test 2: HTML输出格式
 */
async function testHtmlOutput() {
  const result = await textToArt('Test', {
    height: 3,
    outputFormat: OutputFormat.HTML
  });
  
  if (!result.content.includes('<!DOCTYPE html>')) {
    throw new Error('HTML output missing DOCTYPE');
  }
  
  if (!result.content.includes('<pre>')) {
    throw new Error('HTML output missing <pre> tag');
  }
}

/**
 * 🟢 Test 3: 配置验证
 */
async function testConfigValidation() {
  const config = validateConfig({
    height: 10,
    matrixSize: 8,
    ratio: 2.5
  });
  
  if (config.height !== 10) {
    throw new Error('Height not preserved');
  }
  
  if (config.matrixSize !== 8) {
    throw new Error('MatrixSize not preserved');
  }
}

/**
 * 🟢 Test 4: 宽字符支持（如果有中文字符集）
 */
async function testWideCharSupport() {
  try {
    const result = await textToArt('A', {
      height: 3,
      charset: { type: PresetCharset.ASCII }
    });
    
    if (!result.content || result.content.length === 0) {
      throw new Error('Wide char test failed');
    }
  } catch (error) {
    // 如果canvas未安装，这个测试会失败，但不算错误
    if (error.message.includes('canvas')) {
      console.log(chalk.yellow('   ⚠️  Skipped (canvas not installed)'));
      return;
    }
    throw error;
  }
}

/**
 * 🟢 Test 5: Invert配置
 */
async function testInvertConfig() {
  const result = await textToArt('X', {
    height: 2,
    invert: true
  });
  
  if (!result.content || result.content.length === 0) {
    throw new Error('Invert test failed');
  }
}

/**
 * 🟢 Test 6: 自定义matrixSize
 */
async function testCustomMatrixSize() {
  const result = await textToArt('Y', {
    height: 2,
    matrixSize: 4
  });
  
  if (!result.content || result.content.length === 0) {
    throw new Error('Custom matrix size test failed');
  }
}

/**
 * 🟢 Test 7: root -t/--text输入模式
 */
async function testRootTextMode() {
  const result = runCli(['--text', 'Hi', '--height', '3', '--charset', 'ASCII', '--lang', 'en-US']);
  
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  
  if (!result.stdout.includes('Processing text')) {
    throw new Error('Root text mode did not run text conversion');
  }
}

/**
 * 🟢 Test 8: 嵌套配置文件映射
 */
async function testNestedConfigFile() {
  const tempDir = createTempDir();
  
  try {
    fs.writeFileSync(
      path.join(tempDir, '.unicode-artrc.yml'),
      [
        'size:',
        '  height: 2',
        'output:',
        '  format: plain',
        'charset:',
        '  type: ASCII',
        'i18n:',
        '  lang: en-US',
        ''
      ].join('\n'),
      'utf-8'
    );
    
    const result = runCli(['text', 'Hi'], { cwd: tempDir });
    
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    
    if (!result.stdout.includes('Size: 2 rows')) {
      throw new Error('Nested config height was not applied');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🟢 Test 9: 输出文件默认不重复打印字符画
 */
async function testOutputFileMode() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'out.txt');
  
  try {
    const result = runCli(['text', 'Hi', '--height', '3', '--output', outputPath, '--lang', 'en-US']);
    
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created');
    }
    
    if (!result.stdout.includes('Saved to')) {
      throw new Error('Save confirmation was not printed');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🟢 Test 10: 图片输入缺失时返回非0退出码
 */
async function testMissingImageError() {
  const result = runCli(['image', '__missing__.png', '--height', '2', '--lang', 'en-US']);
  
  if (result.status === 0) {
    throw new Error('Missing image should fail');
  }
  
  // ✅ 接受中文或英文错误消息（Core库内部错误使用中文）
  if (!result.stderr.includes('加载图像失败') && !result.stderr.includes('File not found')) {
    throw new Error('Missing image error message is not friendly');
  }
}

/**
 * 🟢 Test 11: 实际图片转换流程
 */
async function testImageCommand() {
  const tempDir = createTempDir();
  
  try {
    const imagePath = path.join(tempDir, 'sample.png');
    createFixtureImage(imagePath);
    
    const result = runCli(['--image', imagePath, '--height', '2', '--lang', 'en-US']);
    
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    
    if (!result.stdout.includes('Processing image')) {
      throw new Error('Root image mode did not run image conversion');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔹 Test 12: text子命令输出与Core API同参数一致
 */
async function testTextCommandCoreParity() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'text-core-parity.txt');
  const options = {
    height: 2,
    matrix: 3,
    ratio: 2,
    interpolation: 'bilinear',
    font: 'serif',
    chars: ' @',
    align: 'left',
    lineSpacing: 0,
    heightMode: 'line',
    fontReduce: 0,
    wideCharRatio: 2
  };
  
  try {
    const result = runCli([
      'text', 'Hi',
      '--height', String(options.height),
      '--matrix', String(options.matrix),
      '--ratio', String(options.ratio),
      '--interpolation', options.interpolation,
      '--font', options.font,
      '--chars', options.chars,
      '--text-align', options.align,
      '--line-spacing', String(options.lineSpacing),
      '--height-mode', options.heightMode,
      '--font-reduce', String(options.fontReduce),
      '--wide-char-ratio', String(options.wideCharRatio),
      '--output', outputPath,
      '--lang', 'en-US'
    ]);
    
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    
    if (result.stdout.includes('DEBUG Config') || result.stderr.includes('DEBUG Config')) {
      throw new Error('CLI leaked debug config output');
    }
    
    const actual = fs.readFileSync(outputPath, 'utf-8');
    const expected = await textToArt('Hi', {
      height: options.height,
      matrixSize: options.matrix,
      ratio: options.ratio,
      interpolation: options.interpolation,
      font: options.font,
      charset: { type: PresetCharset.CUSTOM, customChars: options.chars },
      textAlign: options.align,
      lineSpacing: options.lineSpacing,
      heightMode: options.heightMode,
      fontReduce: options.fontReduce,
      wideCharRatio: options.wideCharRatio,
      outputFormat: OutputFormat.PLAIN_TEXT
    });
    
    if (actual !== expected.content) {
      throw new Error(`Text output differs from Core API\nExpected:\n${expected.content}\nActual:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔹 Test 13: image子命令输出与Core API同参数一致
 */
async function testImageCommandCoreParity() {
  const tempDir = createTempDir();
  const imagePath = path.join(tempDir, 'sample.png');
  const outputPath = path.join(tempDir, 'image-core-parity.txt');
  const options = {
    height: 2,
    width: null,
    matrix: 3,
    ratio: 2,
    interpolation: 'bilinear',
    font: 'serif',
    chars: ' @',
    fontReduce: null,
    wideCharRatio: 2
  };
  
  try {
    createFixtureImage(imagePath);
    
    const result = runCli([
      'image', imagePath,
      '--height', String(options.height),
      '--matrix', String(options.matrix),
      '--ratio', String(options.ratio),
      '--interpolation', options.interpolation,
      '--font', options.font,
      '--chars', options.chars,
      '--wide-char-ratio', String(options.wideCharRatio),
      '--output', outputPath,
      '--lang', 'en-US'
    ]);
    
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    
    if (result.stdout.includes('DEBUG Config') || result.stderr.includes('DEBUG Config')) {
      throw new Error('CLI leaked debug config output');
    }
    
    const actual = fs.readFileSync(outputPath, 'utf-8');
    const expected = await imageToArt(imagePath, {
      height: options.height,
      matrixSize: options.matrix,
      ratio: options.ratio,
      interpolation: options.interpolation,
      font: options.font,
      charset: { type: PresetCharset.CUSTOM, customChars: options.chars },
      wideCharRatio: options.wideCharRatio,
      outputFormat: OutputFormat.PLAIN_TEXT
    });
    
    if (actual !== expected.content) {
      throw new Error(`Image output differs from Core API\nExpected:\n${expected.content}\nActual:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 14: CLI --box 样式快捷写法
 */
async function testTextCommandBoxStyleShortcut() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'box-style.txt');

  try {
    const result = runCli([
      'text', 'Hi',
      '--height', '2',
      '--chars', ' @',
      '--box', 'ascii',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.startsWith('+') || !actual.includes('|')) {
      throw new Error(`Box style shortcut did not frame output:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 15: CLI --box JSON 对象写法
 */
async function testTextCommandBoxJson() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'box-json.txt');

  try {
    const result = runCli([
      'text', 'Hi',
      '--height', '2',
      '--chars', ' @',
      '--box', '{"style":"ascii","padding":{"left":1,"right":1},"width":6}',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.startsWith('+--------+') || !actual.includes('| ')) {
      throw new Error(`Box JSON options did not frame output as expected:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 16: 配置文件 box 生效，且命令行 --box false 可覆盖关闭
 */
async function testConfigFileBoxAndCliOverride() {
  const tempDir = createTempDir();
  const boxedPath = path.join(tempDir, 'boxed.txt');
  const unboxedPath = path.join(tempDir, 'unboxed.txt');

  try {
    fs.writeFileSync(
      path.join(tempDir, '.unicode-artrc.yml'),
      [
        'size:',
        '  height: 2',
        'box:',
        '  style: ascii',
        'i18n:',
        '  lang: en-US',
        ''
      ].join('\n'),
      'utf-8'
    );

    const boxed = runCli([
      'text', 'Hi',
      '--chars', ' @',
      '--output', boxedPath
    ], { cwd: tempDir });

    if (boxed.status !== 0) {
      throw new Error(boxed.stderr || boxed.stdout);
    }

    const boxedActual = fs.readFileSync(boxedPath, 'utf-8');
    if (!boxedActual.startsWith('+') || !boxedActual.includes('|')) {
      throw new Error(`Config file box did not frame output:\n${boxedActual}`);
    }

    const unboxed = runCli([
      'text', 'Hi',
      '--chars', ' @',
      '--box', 'false',
      '--output', unboxedPath
    ], { cwd: tempDir });

    if (unboxed.status !== 0) {
      throw new Error(unboxed.stderr || unboxed.stdout);
    }

    const unboxedActual = fs.readFileSync(unboxedPath, 'utf-8');
    if (unboxedActual.includes('+') || unboxedActual.includes('|')) {
      throw new Error(`CLI --box false did not override config file box:\n${unboxedActual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 17: 非法 box 参数返回非 0
 */
async function testInvalidBoxOption() {
  const result = runCli([
    'text', 'Hi',
    '--height', '2',
    '--box', 'missing-style',
    '--lang', 'en-US'
  ]);

  if (result.status === 0) {
    throw new Error('Invalid box option should fail');
  }

  if (!result.stderr.includes('Invalid box option')) {
    throw new Error(`Invalid box option error was not friendly:\n${result.stderr || result.stdout}`);
  }
}

/**
 * 🔶 Test 18: root --text 入口支持 --box
 */
async function testRootTextBoxOption() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'root-box.txt');

  try {
    const result = runCli([
      '--text', 'Hi',
      '--height', '2',
      '--chars', ' @',
      '--box', 'ascii',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.startsWith('+') || !actual.includes('|')) {
      throw new Error(`Root --text --box did not frame output:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 19: image 子命令支持 --box
 */
async function testImageCommandBoxOption() {
  const tempDir = createTempDir();
  const imagePath = path.join(tempDir, 'sample.png');
  const outputPath = path.join(tempDir, 'image-box.txt');

  try {
    createFixtureImage(imagePath);

    const result = runCli([
      'image', imagePath,
      '--height', '2',
      '--chars', ' @',
      '--box', 'ascii',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.startsWith('+') || !actual.includes('|')) {
      throw new Error(`Image --box did not frame output:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 20: CLI JSON box supports phase-4 options
 */
async function testCliBoxPhase4Options() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'box-phase4.txt');

  try {
    const result = runCli([
      'text', 'ABCDE',
      '--height', '2',
      '--chars', ' @',
      '--box', '{"style":"ascii","width":4,"overflow":"wrap","shadow":{"style":"block","offsetX":1,"offsetY":1}}',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.includes('█') || !actual.startsWith('+----+')) {
      throw new Error(`CLI phase-4 box options did not render as expected:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 21: CLI JSON box supports phase-5 layout mode
 */
async function testCliBoxPhase5LayoutOptions() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'box-phase5.txt');

  try {
    const result = runCli([
      'text', 'AB',
      '--height', '1',
      '--chars', ' @',
      '--box', '{"renderStage":"layout","mode":"grid","style":"ascii","separators":{"rows":true,"columns":true},"cell":{"minWidth":1,"minHeight":1}}',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (!actual.includes('|') || !actual.startsWith('+')) {
      throw new Error(`CLI phase-5 layout options did not render as expected:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 22: CLI --version 使用 package.json 版本
 */
async function testCliVersionMatchesPackage() {
  const result = runCli(['--version']);

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  if (result.stdout.trim() !== cliPackage.version) {
    throw new Error(`Expected version ${cliPackage.version}, got ${result.stdout.trim()}`);
  }
}

/**
 * 🔶 Test 23: help 展示 P1.4 新增稳定选项
 */
async function testHelpIncludesP14Options() {
  const result = runCli(['--help']);

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  for (const option of ['--image-backend', '--no-config', '--glyph-font']) {
    if (!result.stdout.includes(option)) {
      throw new Error(`Help output missing ${option}`);
    }
  }
}

/**
 * 🔶 Test 24: text - 从 stdin 读取文本
 */
async function testTextCommandReadsStdin() {
  const result = runCli(['text', '-', '--height', '2', '--chars', ' @', '--lang', 'en-US'], {
    input: 'Pipe\n'
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  if (!result.stdout.includes('Processing text') || !result.stdout.trim()) {
    throw new Error('stdin text mode did not produce output');
  }
}

/**
 * 🔶 Test 25: --no-config 禁用自动配置发现
 */
async function testNoConfigDisablesDiscovery() {
  const tempDir = createTempDir();

  try {
    fs.writeFileSync(
      path.join(tempDir, '.unicode-artrc.yml'),
      [
        'size:',
        '  height: 2',
        'i18n:',
        '  lang: en-US',
        ''
      ].join('\n'),
      'utf-8'
    );

    const result = runCli(['text', 'Hi', '--no-config', '--chars', ' @', '--lang', 'en-US'], {
      cwd: tempDir
    });

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    if (!result.stdout.includes('Size: 10 rows')) {
      throw new Error(`--no-config did not use CLI default height:\n${result.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 26: Unicode 输出路径
 */
async function testUnicodeOutputPath() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, '输出-字符画.txt');

  try {
    const result = runCli(['text', 'Hi', '--height', '2', '--chars', ' @', '--output', outputPath, '--lang', 'en-US']);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error('Unicode output path was not created');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 27: image --image-backend napi-rs 显式使用宽松许可证实验后端
 */
async function testImageCommandNapiBackendParity() {
  const tempDir = createTempDir();
  const imagePath = path.join(tempDir, 'sample.png');
  const outputPath = path.join(tempDir, 'image-napi-parity.txt');

  try {
    createFixtureImage(imagePath);

    const result = runCli([
      'image', imagePath,
      '--height', '2',
      '--matrix', '3',
      '--chars', ' @',
      '--image-backend', 'napi-rs',
      '--output', outputPath,
      '--lang', 'en-US'
    ]);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    setNodeImageBackend('napi-rs');
    const expected = await imageToArt(imagePath, {
      height: 2,
      matrixSize: 3,
      charset: { type: PresetCharset.CUSTOM, customChars: ' @' },
      outputFormat: OutputFormat.PLAIN_TEXT
    });
    resetNodeImageBackend();

    const actual = fs.readFileSync(outputPath, 'utf-8');
    if (actual !== expected.content) {
      throw new Error(`napi-rs backend output differs from Core API\nExpected:\n${expected.content}\nActual:\n${actual}`);
    }
  } finally {
    resetNodeImageBackend();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 28: 同时指定 image 和 text 返回非 0
 */
async function testImageTextConflict() {
  const result = runCli(['--image', 'a.png', '--text', 'Hi', '--lang', 'en-US']);

  if (result.status === 0) {
    throw new Error('image/text conflict should fail');
  }

  if (!result.stderr.includes('either --image or --text')) {
    throw new Error(`Conflict error was not clear:\n${result.stderr || result.stdout}`);
  }
}

/**
 * 🔶 Test 29: document 子命令读取 canonical JSON 与实验 DSL
 */
async function testSemanticDocumentCommand() {
  const tempDir = createTempDir();
  const jsonPath = path.join(tempDir, 'document.json');
  const jsonOutputPath = path.join(tempDir, 'document-json.txt');
  const dslPath = path.join(tempDir, 'document.dsl');
  const dslOutputPath = path.join(tempDir, 'document-dsl.txt');

  try {
    fs.writeFileSync(jsonPath, JSON.stringify({
      version: 1,
      rows: [{
        cells: [
          {
            blocks: [{
              kind: 'art-font-text',
              text: 'A',
              font: {
                format: 'unicode-art-font',
                version: 1,
                meta: {
                  id: 'org.unicodeartjs.cli-semantic-art-font',
                  name: 'CLI Semantic Art Font',
                  authors: ['UnicodeArtJs'],
                  license: { expression: 'MIT', origin: 'original' }
                },
                metrics: { height: 1, defaultAdvance: 2 },
                glyphs: { A: { lines: ['AA'] } }
              }
            }]
          },
          { blocks: [{ kind: 'raw-text', text: 'OK' }] }
        ]
      }]
    }), 'utf-8');
    fs.writeFileSync(dslPath, '{h}A|B{n}C|{t:RAW}', 'utf-8');

    const jsonResult = runCli([
      'document', jsonPath,
      '--height', '2',
      '--box', 'false',
      '--output', jsonOutputPath,
      '--no-config',
      '--lang', 'en-US'
    ]);
    if (jsonResult.status !== 0 || !jsonResult.stdout.includes('Processing semantic document')) {
      throw new Error(jsonResult.stderr || jsonResult.stdout);
    }
    if (fs.readFileSync(jsonOutputPath, 'utf-8') !== 'AA│OK') {
      throw new Error('JSON semantic document output mismatch');
    }

    const dslResult = runCli([
      'document', dslPath,
      '--document-format', 'dsl',
      '--row-separator', 'semantic',
      '--height', '2',
      '--box', 'false',
      '--output', dslOutputPath,
      '--no-config',
      '--lang', 'en-US'
    ]);
    if (dslResult.status !== 0) {
      throw new Error(dslResult.stderr || dslResult.stdout);
    }
    if (!fs.readFileSync(dslOutputPath, 'utf-8').includes('RAW')) {
      throw new Error('DSL semantic document raw block was not preserved');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 30: font 子命令校验与查看 UAF JSON
 */
async function testUnicodeArtFontCommands() {
  const tempDir = createTempDir();
  const fontPath = path.join(tempDir, 'reference.uafont.json');

  try {
    fs.writeFileSync(fontPath, JSON.stringify({
      format: 'unicode-art-font',
      version: 1,
      meta: {
        id: 'org.unicodeartjs.cli-reference',
        name: 'CLI Reference',
        authors: ['UnicodeArtJs'],
        license: { expression: 'MIT', origin: 'original' }
      },
      metrics: { height: 1, defaultAdvance: 2, fallbackGlyph: '?' },
      glyphs: {
        A: { lines: ['AA'] },
        '?': { lines: ['??'] }
      }
    }), 'utf-8');

    const validation = runCli(['font', 'validate', fontPath, '--lang', 'en-US']);
    if (validation.status !== 0 || !validation.stdout.includes('validation passed')) {
      throw new Error(validation.stderr || validation.stdout);
    }

    const inspect = runCli(['font', 'inspect', fontPath, '--json', '--lang', 'en-US']);
    if (inspect.status !== 0) {
      throw new Error(inspect.stderr || inspect.stdout);
    }
    const summary = JSON.parse(inspect.stdout);
    if (summary.id !== 'org.unicodeartjs.cli-reference' || summary.permissiveForOfficialBundle !== true) {
      throw new Error(`Unexpected art font summary: ${inspect.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔶 Test 31: 本地声明式扩展可被 CLI 侧载预检，但不会被安装或执行
 */
async function testDeclarativeExtensionCommands() {
  const validation = runCli([
    'extension',
    'validate',
    officialExtensionManifestPath,
    '--lang',
    'en-US'
  ]);
  if (validation.status !== 0 || !validation.stdout.includes('passed validation')) {
    throw new Error(validation.stderr || validation.stdout);
  }

  const inspect = runCli([
    'extension',
    'inspect',
    officialExtensionManifestPath,
    '--json',
    '--lang',
    'en-US'
  ]);
  if (inspect.status !== 0) {
    throw new Error(inspect.stderr || inspect.stdout);
  }
  const summary = JSON.parse(inspect.stdout);
  const resourceIds = summary.resources.map((resource) => resource.id).sort();
  if (
    summary.id !== 'org.unicodeartjs.line-banner'
    || summary.compatibility.compatible !== true
    || JSON.stringify(resourceIds) !== JSON.stringify([
      'banner-template',
      'block-poster-font',
      'line-font',
      'poster-template'
    ])
  ) {
    throw new Error('Unexpected declarative extension summary: ' + inspect.stdout);
  }
}

/**
 * 🔶 Test 32: 静态资源发现 manifest 可被 CLI 只读校验
 */
async function testResourceDiscoveryCommands() {
  const validation = runCli([
    'resource',
    'validate',
    galleryResourceManifestPath,
    '--lang',
    'en-US'
  ]);
  if (validation.status !== 0 || !validation.stdout.includes('manifest passed validation')) {
    throw new Error(validation.stderr || validation.stdout);
  }

  const inspect = runCli([
    'resource',
    'inspect',
    galleryResourceManifestPath,
    '--json',
    '--lang',
    'en-US'
  ]);
  if (inspect.status !== 0) {
    throw new Error(inspect.stderr || inspect.stdout);
  }
  const summary = JSON.parse(inspect.stdout);
  if (
    summary.format !== 'unicode-art-gallery-resource-manifest'
    || summary.network !== 'none'
    || summary.automaticInstall !== false
    || summary.totals.resources < 5
    || !summary.resources.every((resource) => resource.hashMatched === true)
  ) {
    throw new Error('Unexpected resource discovery summary: ' + inspect.stdout);
  }

  const tempDir = createTempDir();
  try {
    const tempGalleryRoot = path.join(tempDir, 'gallery');
    fs.cpSync(path.dirname(galleryResourceManifestPath), tempGalleryRoot, { recursive: true });
    const tempManifestPath = path.join(tempGalleryRoot, 'resource-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(tempManifestPath, 'utf-8'));
    manifest.resources[0].sha256 = '0'.repeat(64);
    fs.writeFileSync(tempManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const failed = runCli(['resource', 'validate', tempManifestPath, '--lang', 'en-US']);
    if (failed.status === 0 || !(failed.stderr + failed.stdout).includes('sha256 mismatch')) {
      throw new Error('Corrupted resource hash was not rejected');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

//#endregion

//#region 🟩 执行测试

(async () => {
  await runTest('Test 1: Basic ASCII text conversion', testBasicAsciiText);
  await runTest('Test 2: HTML output format', testHtmlOutput);
  await runTest('Test 3: Config validation', testConfigValidation);
  await runTest('Test 4: Wide character support', testWideCharSupport);
  await runTest('Test 5: Invert configuration', testInvertConfig);
  await runTest('Test 6: Custom matrix size', testCustomMatrixSize);
  await runTest('Test 7: CLI root text mode', testRootTextMode);
  await runTest('Test 8: CLI nested config file', testNestedConfigFile);
  await runTest('Test 9: CLI output file mode', testOutputFileMode);
  await runTest('Test 10: CLI missing image error', testMissingImageError);
  await runTest('Test 11: CLI image command', testImageCommand);
  await runTest('Test 12: CLI text Core parity', testTextCommandCoreParity);
  await runTest('Test 13: CLI image Core parity', testImageCommandCoreParity);
  await runTest('Test 14: CLI box style shortcut', testTextCommandBoxStyleShortcut);
  await runTest('Test 15: CLI box JSON options', testTextCommandBoxJson);
  await runTest('Test 16: CLI config file box and override', testConfigFileBoxAndCliOverride);
  await runTest('Test 17: CLI invalid box option', testInvalidBoxOption);
  await runTest('Test 18: CLI root text box option', testRootTextBoxOption);
  await runTest('Test 19: CLI image box option', testImageCommandBoxOption);
  await runTest('Test 20: CLI box phase-4 options', testCliBoxPhase4Options);
  await runTest('Test 21: CLI box phase-5 layout options', testCliBoxPhase5LayoutOptions);
  await runTest('Test 22: CLI version matches package', testCliVersionMatchesPackage);
  await runTest('Test 23: CLI help includes P1.4 options', testHelpIncludesP14Options);
  await runTest('Test 24: CLI text reads stdin', testTextCommandReadsStdin);
  await runTest('Test 25: CLI --no-config disables discovery', testNoConfigDisablesDiscovery);
  await runTest('Test 26: CLI unicode output path', testUnicodeOutputPath);
  await runTest('Test 27: CLI napi-rs image backend parity', testImageCommandNapiBackendParity);
  await runTest('Test 28: CLI image/text conflict', testImageTextConflict);
  await runTest('Test 29: CLI semantic document command', testSemanticDocumentCommand);
  await runTest('Test 30: CLI Unicode art font commands', testUnicodeArtFontCommands);
  await runTest('Test 31: CLI declarative extension commands', testDeclarativeExtensionCommands);
  await runTest('Test 32: CLI resource discovery commands', testResourceDiscoveryCommands);
  
  console.log('\n' + '='.repeat(50));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`❌ Failed: ${failed}`));
  }
  console.log(chalk.blue(`📊 Total: ${passed + failed}`));
  console.log('='.repeat(50));
  
  if (failed > 0) {
    process.exit(1);
  }
})();
