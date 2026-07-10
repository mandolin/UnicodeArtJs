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

const { textToArt, validateConfig, PresetCharset, OutputFormat } = require('unicode-art-js');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log(chalk.blue('🧪 Starting E2E Tests...\n'));

let passed = 0;
let failed = 0;
const cliPath = path.resolve(__dirname, '..', 'src', 'console.js');
const pythonProjectRoot = 'K:/Project/Github_mandolin/UnicodeArt';
const pythonHelperPath = path.join(pythonProjectRoot, 'test_golden_helper.py');
const pythonSourceRoot = path.join(pythonProjectRoot, 'src');
const referenceFont = 'C:/Windows/Fonts/arial.ttf';

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
 * 🔹 运行Python参考项目代码
 */
function runPython(code, args = []) {
  const result = spawnSync('python', ['-c', code, ...args], {
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONPATH: pythonSourceRoot
    }
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  return result.stdout.trim();
}

/**
 * 🔹 使用Python参考项目生成文本字符画
 */
function runPythonTextReference(text, options) {
  const code = `
import json
import sys
from unicodeart import unicodeart_util as u

text = json.loads(sys.argv[1])
font = sys.argv[2]
chars = sys.argv[3]
height = int(sys.argv[4])
matrix = int(sys.argv[5])
ratio = float(sys.argv[6])
interpolation = sys.argv[7]
align = sys.argv[8]
line_spacing = int(sys.argv[9])
height_mode = sys.argv[10]
font_reduce = int(sys.argv[11])
wide_char_ratio = float(sys.argv[12])

base = u.get_baseimg(text, font, height, matrix, align, line_spacing, height_mode, font_reduce)
if height_mode == 'total':
    sampling_height = height
else:
    lines_count = len(u.preprocess_text_input(text))
    sampling_height = height * lines_count + line_spacing * max(0, lines_count - 1)
sampling = u.get_sampling_array(base, sampling_height, None, ratio, matrix, interpolation)
char_data, wide_char_data = u.get_char_data(chars, font, matrix, ratio, interpolation)
print(json.dumps(u.get_final_output(sampling, char_data, wide_char_data, None, wide_char_ratio), ensure_ascii=False))
`;

  const output = runPython(code, [
    JSON.stringify(text),
    options.font,
    options.chars,
    String(options.height),
    String(options.matrix),
    String(options.ratio),
    options.interpolation,
    options.align,
    String(options.lineSpacing),
    options.heightMode,
    String(options.fontReduce),
    String(options.wideCharRatio)
  ]);

  return JSON.parse(output);
}

/**
 * 🔹 使用Python参考项目生成图片字符画
 */
function runPythonImageReference(imagePath, options) {
  const result = spawnSync('python', [
    pythonHelperPath,
    imagePath,
    options.height == null ? 'None' : String(options.height),
    options.width == null ? 'None' : String(options.width),
    String(options.ratio),
    String(options.matrix),
    options.interpolation,
    options.font,
    options.chars,
    options.fontReduce == null ? 'None' : String(options.fontReduce),
    String(options.wideCharRatio)
  ], {
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  const lastLine = result.stdout.trim().split(/\r?\n/).pop();
  if (!lastLine) {
    throw new Error('Python reference helper returned empty output');
  }

  return JSON.parse(lastLine);
}

/**
 * 🟢 创建临时目录
 */
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-cli-'));
}

/**
 * 🔹 创建Python/OpenCV也能稳定读取的PNG测试图
 */
function createReferenceImage(imagePath) {
  const code = `
import cv2
import numpy as np
import sys

img = np.array([
    [0, 255, 64, 192],
    [255, 0, 192, 64],
    [64, 192, 0, 255],
    [192, 64, 255, 0],
], dtype=np.uint8)
if not cv2.imwrite(sys.argv[1], img):
    raise RuntimeError('failed to write png')
`;

  runPython(code, [imagePath]);
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
    createReferenceImage(imagePath);
    
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
 * 🔹 Test 12: text子命令输出与Python参考项目逐字一致
 */
async function testTextCommandReferenceParity() {
  const tempDir = createTempDir();
  const outputPath = path.join(tempDir, 'text-reference.txt');
  const options = {
    height: 2,
    matrix: 3,
    ratio: 2,
    interpolation: 'bilinear',
    font: referenceFont,
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
    const expected = runPythonTextReference('Hi', options);
    
    if (actual !== expected) {
      throw new Error(`Text output differs from Python reference\nExpected:\n${expected}\nActual:\n${actual}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 🔹 Test 13: image子命令输出与Python参考项目逐字一致
 */
async function testImageCommandReferenceParity() {
  const tempDir = createTempDir();
  const imagePath = path.join(tempDir, 'sample.png');
  const outputPath = path.join(tempDir, 'image-reference.txt');
  const options = {
    height: 2,
    width: null,
    matrix: 3,
    ratio: 2,
    interpolation: 'bilinear',
    font: referenceFont,
    chars: ' @',
    fontReduce: null,
    wideCharRatio: 2
  };
  
  try {
    createReferenceImage(imagePath);
    
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
    const expected = runPythonImageReference(imagePath, options);
    
    if (actual !== expected) {
      throw new Error(`Image output differs from Python reference\nExpected:\n${expected}\nActual:\n${actual}`);
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
    createReferenceImage(imagePath);

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
  await runTest('Test 12: CLI text reference parity', testTextCommandReferenceParity);
  await runTest('Test 13: CLI image reference parity', testImageCommandReferenceParity);
  await runTest('Test 14: CLI box style shortcut', testTextCommandBoxStyleShortcut);
  await runTest('Test 15: CLI box JSON options', testTextCommandBoxJson);
  await runTest('Test 16: CLI config file box and override', testConfigFileBoxAndCliOverride);
  await runTest('Test 17: CLI invalid box option', testInvalidBoxOption);
  await runTest('Test 18: CLI root text box option', testRootTextBoxOption);
  await runTest('Test 19: CLI image box option', testImageCommandBoxOption);
  await runTest('Test 20: CLI box phase-4 options', testCliBoxPhase4Options);
  await runTest('Test 21: CLI box phase-5 layout options', testCliBoxPhase5LayoutOptions);
  
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
