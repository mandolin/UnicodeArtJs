#!/usr/bin/env node

/**
 * ============================================================================
 * 🟦 UnicodeArtJs CLI 主入口
 * ============================================================================
 * 
 * 🔶 模块职责
 * - 解析命令行参数
 * - 加载配置文件
 * - 调用core库进行转换
 * - 输出结果到终端或文件
 * 
 * 🔶 使用方式
 * 
 * **图片转字符画**:
 * ```bash
 * unicode-art image photo.jpg -o output.txt
 * ```
 * 
 * **文本转字符画**:
 * ```bash
 * unicode-art text "Hello World" -o output.txt
 * ```
 * 
 * 🔶 命令行参数
 * 
 * **输入模式**:
 * - `-i, --image <path>` - 图片路径
 * - `-t, --text <text>` - 文本字符串
 * 
 * **输出控制**:
 * - `-o, --output <path>` - 输出文件路径
 * - `-p, --print` - 直接打印到终端（默认）
 * 
 * **尺寸参数**:
 * - `-e, --height <number>` - 输出高度（行数）
 * - `-w, --width <number>` - 输出宽度（列数）
 * 
 * **字符集**:
 * - `-a, --chars <string>` - 自定义字符集
 * - `--charset <type>` - 预设字符集 (ASCII|EXTENDED|CHINESE_SIMPLE)
 * 
 * **字体配置**:
 * - `-f, --font <name>` - 字体名称
 * - `--font-style <style>` - 字体样式 (regular|bold|italic|bold-italic)
 * 
 * **高级选项**:
 * - `-m, --matrix <size>` - 矩阵大小 (默认6)
 * - `-r, --ratio <number>` - 垂直水平比例 (默认2.0)
 * - `-v, --invert` - 反转颜色
 * - `--interpolation <type>` - 插值算法 (nearest|bilinear|bicubic)
 * 
 * **多行文本**:
 * - `--text-align <align>` - 文本对齐 (left|center|right)
 * - `--line-spacing <number>` - 行间距
 * - `--height-mode <mode>` - 高度模式 (line|total)
 * 
 * **国际化**:
 * - `--lang <locale>` - 语言 (zh-CN|en-US)
 * 
 * **其他**:
 * - `-c, --config <path>` - 配置文件路径
 * - `--help` - 显示帮助信息
 * - `--version` - 显示版本号
 * 
 * @module @unicode-art/cli
 * @since 1.0.0
 * @license MIT
 * ============================================================================
 */

const { Command } = require('commander');
const { cosmiconfig } = require('cosmiconfig');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const cliPackage = require('../package.json');

// 导入core库
const {
  imageToArt,
  isPermissiveUnicodeArtFontLicense,
  parseUnicodeArtFontJson,
  parseSemanticDocumentJson,
  parseSemanticDsl,
  semanticDocumentToArt,
  textToArt,
  validateConfig,
  OutputFormat,
  PresetCharset,
  Interpolation,
  FontStyle,
  TextAlign,
  HeightMode,
  getCoreCapabilities,
  isBoxStyleName,
  normalizeBoxOptions,
  setNodeImageBackend
} = require('unicode-art-js');

//#region 🟩 国际化管理

/**
 * 🟢 加载语言文件
 * 
 * @param {string} lang - 语言代码 (zh-CN|en-US)
 * @returns {Object} 翻译对象
 */
function loadLanguage(lang) {
  const supportedLangs = ['zh-CN', 'en-US'];
  const safeLang = supportedLangs.includes(lang) ? lang : 'zh-CN';
  
  try {
    const langPath = path.join(__dirname, '..', 'locales', `${safeLang}.json`);
    const content = fs.readFileSync(langPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Failed to load language ${lang}, using zh-CN`));
    const fallbackPath = path.join(__dirname, '..', 'locales', 'zh-CN.json');
    const content = fs.readFileSync(fallbackPath, 'utf-8');
    return JSON.parse(content);
  }
}

/**
 * 🟢 翻译文本（支持变量替换）
 * 
 * @param {Object} i18n - 翻译对象
 * @param {string} key - 键路径（如 "commands.image.processing"）
 * @param {Object} vars - 变量替换对象
 * @returns {string} 翻译后的文本
 */
function t(i18n, key, vars = {}) {
  const keys = key.split('.');
  let value = i18n;
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // 找不到返回原key
    }
  }
  
  if (typeof value === 'string') {
    // 替换变量 ${varName}
    return value.replace(/\$\{(\w+)\}/g, (match, varName) => {
      return vars[varName] !== undefined ? vars[varName] : match;
    });
  }
  
  return value || key;
}

//#endregion

// 程序版本
const program = new Command();

program
  .name('unicode-art')
  .description('Convert text and images to Unicode character art')
  .version(cliPackage.version)
  .option('-i, --image <path>', 'Convert image file to character art')
  .option('-t, --text <text>', 'Convert text to character art')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --print [mode]', 'Print to terminal when output file is set (spec|all|debug)')
  .option('-e, --height <number>', 'Output height in rows', parseInt)
  .option('-w, --width <number>', 'Output width in columns', parseInt)
  .option('-a, --chars <string>', 'Custom character set')
  .option('--charset <type>', 'Preset charset (ASCII|EXTENDED|CHINESE_SIMPLE)')
  .option('-f, --font <name>', 'Visual font name or path (legacy alias)')
  .option('--visual-font <name>', 'Visual font name or path')
  .option('--glyph-font <name>', 'Glyph display font family')
  .option('--glyph-width-profile <name>', 'Glyph width profile name')
  .option('--wide-char-regex <regex>', 'Custom wide glyph regular expression')
  .option('--output-target <target>', 'Output target (plain|terminal|web|vscode|electron|html|ansi)')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Visual font inset/reduction', parseInt)
  .option('-m, --matrix <size>', 'Matrix size', parseInt)
  .option('-r, --ratio <number>', 'Vertical/horizontal ratio', parseFloat)
  .option('-v, --invert', 'Invert colors')
  .option('--interpolation <type>', 'Interpolation algorithm (nearest|bilinear|bicubic|lanczos)')
  .option('--wide-char-ratio <number>', 'Wide character matching ratio', parseFloat)
  .option('--text-align <align>', 'Text alignment (left|center|right)')
  .option('--line-spacing <number>', 'Line spacing', parseFloat)
  .option('--height-mode <mode>', 'Height mode (line|total)')
  .option('--trim-trailing-spaces', 'Trim trailing spaces')
  .option('--format <format>', 'Output format (plain|html|ansi)')
  .option('--image-backend <backend>', 'Node image backend for image input (napi-rs|sharp)')
  .option('-b, --box <json-or-style>', 'Box options: true, false, style name, or JSON object')
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
  .option('--no-config', 'Disable config file discovery')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const command = args[args.length - 1];
      const options = getCommandOptions(command);
      if (options.image && options.text) {
        throw new Error('Please specify either --image or --text, not both');
      }
      if (options.image) {
        await handleImageCommand(options.image, options);
        return;
      }
      if (options.text) {
        await handleTextCommand(options.text, options);
        return;
      }
      program.help();
    } catch (error) {
      handleError(error);
    }
  });

//#region 🟩 命令定义

/**
 * 🟢 图片转字符画命令
 */
program
  .command('image')
  .description('Convert image to character art')
  .argument('<input>', 'Input image path')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --print [mode]', 'Print to terminal when output file is set (spec|all|debug)')
  .option('-e, --height <number>', 'Output height in rows', parseInt)
  .option('-w, --width <number>', 'Output width in columns', parseInt)
  .option('-a, --chars <string>', 'Custom character set')
  .option('--charset <type>', 'Preset charset (ASCII|EXTENDED|CHINESE_SIMPLE)')
  .option('-f, --font <name>', 'Visual font name or path (legacy alias)')
  .option('--visual-font <name>', 'Visual font name or path')
  .option('--glyph-font <name>', 'Glyph display font family')
  .option('--glyph-width-profile <name>', 'Glyph width profile name')
  .option('--wide-char-regex <regex>', 'Custom wide glyph regular expression')
  .option('--output-target <target>', 'Output target (plain|terminal|web|vscode|electron|html|ansi)')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Visual font inset/reduction', parseInt)
  .option('-m, --matrix <size>', 'Matrix size', parseInt)
  .option('-r, --ratio <number>', 'Vertical/horizontal ratio', parseFloat)
  .option('-v, --invert', 'Invert colors')
  .option('--interpolation <type>', 'Interpolation algorithm (nearest|bilinear|bicubic|lanczos)')
  .option('--wide-char-ratio <number>', 'Wide character matching ratio', parseFloat)
  .option('--trim-trailing-spaces', 'Trim trailing spaces')
  .option('--format <format>', 'Output format (plain|html|ansi)')
  .option('--image-backend <backend>', 'Node image backend for image input (napi-rs|sharp)')
  .option('-b, --box <json-or-style>', 'Box options: true, false, style name, or JSON object')
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
  .option('--no-config', 'Disable config file discovery')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const input = args[0];
      const command = args[args.length - 1];
      const options = getCommandOptions(command);
      await handleImageCommand(input, options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * 🟢 文本转字符画命令
 */
program
  .command('text')
  .description('Convert text to character art')
  .argument('<text>', 'Input text string')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --print [mode]', 'Print to terminal when output file is set (spec|all|debug)')
  .option('-e, --height <number>', 'Output height in rows', parseInt)
  .option('-w, --width <number>', 'Output width in columns', parseInt)
  .option('-a, --chars <string>', 'Custom character set')
  .option('--charset <type>', 'Preset charset (ASCII|EXTENDED|CHINESE_SIMPLE)')
  .option('-f, --font <name>', 'Visual font name or path (legacy alias)')
  .option('--visual-font <name>', 'Visual font name or path')
  .option('--glyph-font <name>', 'Glyph display font family')
  .option('--glyph-width-profile <name>', 'Glyph width profile name')
  .option('--wide-char-regex <regex>', 'Custom wide glyph regular expression')
  .option('--output-target <target>', 'Output target (plain|terminal|web|vscode|electron|html|ansi)')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Visual font inset/reduction', parseInt)
  .option('-m, --matrix <size>', 'Matrix size', parseInt)
  .option('-r, --ratio <number>', 'Vertical/horizontal ratio', parseFloat)
  .option('-v, --invert', 'Invert colors')
  .option('--interpolation <type>', 'Interpolation algorithm (nearest|bilinear|bicubic|lanczos)')
  .option('--wide-char-ratio <number>', 'Wide character matching ratio', parseFloat)
  .option('--text-align <align>', 'Text alignment (left|center|right)')
  .option('--line-spacing <number>', 'Line spacing', parseFloat)
  .option('--height-mode <mode>', 'Height mode (line|total)')
  .option('--trim-trailing-spaces', 'Trim trailing spaces')
  .option('--format <format>', 'Output format (plain|html|ansi)')
  .option('-b, --box <json-or-style>', 'Box options: true, false, style name, or JSON object')
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
  .option('--no-config', 'Disable config file discovery')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const text = args[0];
      const command = args[args.length - 1];
      const options = getCommandOptions(command);
      await handleTextCommand(text, options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * 🟢 语义文档转字符画命令
 *
 * 🔹 默认读取版本化 JSON AST；`--document-format dsl` 可读取实验性轻量 DSL。
 * 🔹 DSL 不作为普通 text 输入的隐式语法，避免已有文本转换行为发生歧义。
 */
program
  .command('document')
  .description('Render an experimental semantic Unicode art document')
  .argument('<input>', 'Input JSON/DSL document path, or - for stdin')
  .option('--document-format <format>', 'Document input format (json|dsl)', 'json')
  .option('--row-separator <mode>', 'DSL row separator (lineBreak|semantic|both)')
  .option('--column-separator <separator>', 'DSL cell separator')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --print [mode]', 'Print to terminal when output file is set (spec|all|debug)')
  .option('-e, --height <number>', 'Art-text block height in rows', parseInt)
  .option('-w, --width <number>', 'Art-text block width in columns', parseInt)
  .option('-a, --chars <string>', 'Custom character set for art-text blocks')
  .option('--charset <type>', 'Preset charset for art-text blocks (ASCII|EXTENDED|CHINESE_SIMPLE)')
  .option('-f, --font <name>', 'Visual font name or path (legacy alias)')
  .option('--visual-font <name>', 'Visual font name or path')
  .option('--glyph-font <name>', 'Glyph display font family')
  .option('--glyph-width-profile <name>', 'Glyph width profile name')
  .option('--wide-char-regex <regex>', 'Custom wide glyph character class')
  .option('--output-target <target>', 'Output target (plain|terminal|web|vscode|electron|html|ansi)')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Visual font inset/reduction', parseInt)
  .option('-m, --matrix <size>', 'Matrix size', parseInt)
  .option('-r, --ratio <number>', 'Vertical/horizontal ratio', parseFloat)
  .option('-v, --invert', 'Invert colors')
  .option('--interpolation <type>', 'Interpolation algorithm (nearest|bilinear|bicubic|lanczos)')
  .option('--wide-char-ratio <number>', 'Wide character matching ratio', parseFloat)
  .option('--text-align <align>', 'Text alignment (left|center|right)')
  .option('--line-spacing <number>', 'Line spacing', parseFloat)
  .option('--height-mode <mode>', 'Height mode (line|total)')
  .option('--trim-trailing-spaces', 'Trim trailing spaces')
  .option('--format <format>', 'Output format (plain|html|ansi)')
  .option('-b, --box <json-or-style>', 'Box options: true, false, style name, or JSON object')
  .option('-c, --config <path>', 'Config file path')
  .option('--no-config', 'Disable config file discovery')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const input = args[0];
      const command = args[args.length - 1];
      const options = getCommandOptions(command);
      await handleDocumentCommand(input, options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * 🟢 Unicode 艺术字字体检查命令组
 *
 * 🔹 只读取本地文件或 stdin，不下载、安装或执行第三方字体资产。
 * 🔹 UAF 格式仍是 experimental；该命令用于创作者和二次开发者的预检。
 */
const fontCommand = program
  .command('font')
  .description('Inspect experimental Unicode art font documents');

fontCommand
  .command('validate')
  .description('Validate a .uafont.json document')
  .argument('<input>', 'Input UAF JSON path, or - for stdin')
  .option('--json', 'Print machine-readable font summary')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const input = args[0];
      const command = args[args.length - 1];
      await handleArtFontCommand(input, getCommandOptions(command), 'validate');
    } catch (error) {
      handleError(error);
    }
  });

fontCommand
  .command('inspect')
  .description('Inspect a .uafont.json document without rendering it')
  .argument('<input>', 'Input UAF JSON path, or - for stdin')
  .option('--json', 'Print machine-readable font summary')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const input = args[0];
      const command = args[args.length - 1];
      await handleArtFontCommand(input, getCommandOptions(command), 'inspect');
    } catch (error) {
      handleError(error);
    }
  });

//#endregion

//#region 🟩 命令处理函数

/**
 * 🟢 获取Commander解析后的选项
 * 
 * @param {Command|Object} command - Commander命令对象或选项对象
 * @returns {Object} 解析后的选项
 */
function getCommandOptions(command) {
  if (command && typeof command.optsWithGlobals === 'function') {
    return command.optsWithGlobals();
  }
  return command && typeof command.opts === 'function' ? command.opts() : command;
}

/**
 * 🟢 处理图片转换命令
 * 
 * @param {string} input - 输入图片路径
 * @param {Object} options - 命令行选项
 */
async function handleImageCommand(input, options) {
  // 加载配置文件
  const config = await loadConfig(options.config);
  
  // 加载语言（命令行 > 配置文件 > 默认）
  const lang = options.lang || config.i18n?.lang || config.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  
  // 合并配置（命令行 > 配置文件 > 默认值）
  const fullConfig = mergeConfig(config, options);
  const runtimeConfig = extractRuntimeConfig(fullConfig);
  fullConfig.locale = lang;
  
  // 验证配置
  const validatedConfig = validateConfig(fullConfig);
  
  console.log(chalk.blue(t(i18n, 'commands.image.processing')));
  const startTime = Date.now();
  
  try {
    applyImageBackend(runtimeConfig.imageBackend);

    // 调用core库
    const result = await imageToArt(input, validatedConfig);
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(t(i18n, 'commands.image.completed', { duration })));
    console.log(chalk.gray(t(i18n, 'commands.image.size', { rows: result.rows, cols: result.cols })));
    
    // 输出结果
    await outputResult(result, options.output, options.print, i18n);
  } catch (error) {
    handleError(error, i18n);
  }
}

/**
 * 🟢 处理文本转换命令
 * 
 * @param {string} text - 输入文本
 * @param {Object} options - 命令行选项
 */
async function handleTextCommand(text, options) {
  // 加载配置文件
  const config = await loadConfig(options.config);
  const inputText = readTextInput(text);
  
  // 加载语言（命令行 > 配置文件 > 默认）
  const lang = options.lang || config.i18n?.lang || config.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  
  // 合并配置
  const fullConfig = mergeConfig(config, options);
  fullConfig.locale = lang;
  
  // 验证配置
  const validatedConfig = validateConfig(fullConfig);
  
  console.log(chalk.blue(t(i18n, 'commands.text.processing')));
  const startTime = Date.now();
  
  try {
    // 调用core库
    const result = await textToArt(inputText, validatedConfig);
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(t(i18n, 'commands.text.completed', { duration })));
    console.log(chalk.gray(t(i18n, 'commands.text.size', { rows: result.rows, cols: result.cols })));
    
    // 输出结果
    await outputResult(result, options.output, options.print, i18n);
  } catch (error) {
    handleError(error, i18n);
  }
}

/**
 * 🟢 处理语义文档转换命令
 *
 * 🔹 JSON 是稳定候选 canonical 输入；DSL 仅通过显式 format 开关进入解析器。
 * 🔹 文档 options 的字素宽度配置由 Core 统一处理，CLI 不重复解释。
 */
async function handleDocumentCommand(input, options) {
  const config = await loadConfig(options.config);
  const lang = options.lang || config.i18n?.lang || config.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  const fullConfig = mergeConfig(config, options);
  fullConfig.locale = lang;
  const validatedConfig = validateConfig(fullConfig);
  const source = readStructuredInput(input, 'Document');
  const format = String(options.documentFormat || 'json').toLowerCase();
  let document;

  if (format === 'json') {
    document = parseSemanticDocumentJson(source, { locale: lang });
  } else if (format === 'dsl') {
    document = parseSemanticDsl(source, {
      rowSeparator: options.rowSeparator,
      columnSeparator: options.columnSeparator,
      locale: lang
    });
  } else {
    throw new Error(`Unsupported document format: ${options.documentFormat}`);
  }

  console.log(chalk.blue(t(i18n, 'commands.document.processing')));
  const startTime = Date.now();
  try {
    const result = await semanticDocumentToArt(document, validatedConfig);
    const duration = Date.now() - startTime;
    console.log(chalk.green(t(i18n, 'commands.document.completed', { duration })));
    console.log(chalk.gray(t(i18n, 'commands.document.size', { rows: result.rows, cols: result.cols })));
    await outputResult(result, options.output, options.print, i18n);
  } catch (error) {
    handleError(error, i18n);
  }
}

/**
 * 🟢 处理 Unicode 艺术字字体校验和查看命令
 *
 * 🔹 许可证政策结果只是“是否可进入官方随包候选”的机器判断，不是法律意见。
 * 🔹 该命令不渲染艺术字，完整布局输出由后续 P3.3 渲染引擎承接。
 */
async function handleArtFontCommand(input, options, operation) {
  const lang = options.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  const source = readStructuredInput(input, 'Font');
  const font = parseUnicodeArtFontJson(source, { locale: lang });
  const summary = {
    format: font.format,
    version: font.version,
    id: font.meta.id,
    name: font.meta.name,
    authors: font.meta.authors,
    license: font.meta.license.expression,
    origin: font.meta.license.origin,
    glyphs: Object.keys(font.glyphs).length,
    height: font.metrics.height,
    defaultAdvance: font.metrics.defaultAdvance,
    permissiveForOfficialBundle: isPermissiveUnicodeArtFontLicense(font.meta.license.expression)
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (operation === 'validate') {
    console.log(chalk.green(t(i18n, 'commands.font.valid')));
  }
  console.log(chalk.blue(t(i18n, 'commands.font.summary', summary)));
  console.log(chalk.gray(t(i18n, 'commands.font.license', summary)));
}

//#endregion

//#region 🟩 配置管理

/**
 * 🟢 加载配置文件
 * 
 * @param {string} configPath - 配置文件路径（可选）
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig(configPath) {
  try {
    if (configPath === false) {
      return {};
    }

    const explorer = cosmiconfig('unicode-art');
    let result;
    
    if (configPath) {
      // 加载指定路径的配置文件
      result = await explorer.load(configPath);
    } else {
      // 自动查找配置文件
      result = await explorer.search();
    }
    
    if (result && !result.isEmpty) {
      console.log(chalk.gray(`📄 Config loaded from: ${result.filepath}`));
      return result.config;
    }
    
    return {};
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load config, using defaults'));
    return {};
  }
}

/**
 * 🟢 合并配置（命令行 > 配置文件 > 默认值）
 * 
 * @param {Object} fileConfig - 配置文件中的配置
 * @param {Object} cliOptions - 命令行选项
 * @returns {Object} 合并后的配置
 */
function mergeConfig(fileConfig, cliOptions) {
  const merged = normalizeConfig(fileConfig);
  
  // 命令行参数覆盖配置文件
  if (hasOption(cliOptions, 'height')) merged.height = requireFiniteNumber(cliOptions.height, 'height');
  if (hasOption(cliOptions, 'width')) merged.width = requireFiniteNumber(cliOptions.width, 'width');
  
  // 🔹 如果未指定height和width，提供默认值（避免Core库验证失败）
  if (!merged.height && !merged.width) {
    merged.height = 10; // 默认高度为10行
  }
  
  if (hasOption(cliOptions, 'chars')) {
    merged.charset = {
      type: PresetCharset.CUSTOM,
      customChars: cliOptions.chars
    };
  }
  if (hasOption(cliOptions, 'charset')) {
    merged.charset = {
      ...(merged.charset || {}),
      type: cliOptions.charset
    };
  }
  if (hasOption(cliOptions, 'font')) merged.font = cliOptions.font;
  if (hasOption(cliOptions, 'visualFont')) merged.visualFont = { ...(merged.visualFont || {}), family: cliOptions.visualFont };
  if (hasOption(cliOptions, 'fontStyle')) merged.fontStyle = normalizeFontStyle(cliOptions.fontStyle);
  if (hasOption(cliOptions, 'fontReduce')) {
    merged.fontReduce = requireFiniteNumber(cliOptions.fontReduce, 'font-reduce');
  }
  if (hasOption(cliOptions, 'glyphFont')) {
    merged.glyphFont = { ...(merged.glyphFont || {}), family: cliOptions.glyphFont };
    merged.glyphFontFamily = cliOptions.glyphFont;
  }
  if (hasOption(cliOptions, 'glyphWidthProfile')) {
    merged.glyphFont = { ...(merged.glyphFont || {}), widthProfile: cliOptions.glyphWidthProfile };
    merged.glyphWidthProfile = cliOptions.glyphWidthProfile;
  }
  if (hasOption(cliOptions, 'wideCharRegex')) {
    merged.glyphFont = { ...(merged.glyphFont || {}), wideCharRegex: cliOptions.wideCharRegex };
    merged.wideCharRegex = cliOptions.wideCharRegex;
  }
  if (hasOption(cliOptions, 'matrix')) merged.matrixSize = requireFiniteNumber(cliOptions.matrix, 'matrix');
  if (hasOption(cliOptions, 'ratio')) merged.ratio = requireFiniteNumber(cliOptions.ratio, 'ratio');
  if (hasOption(cliOptions, 'invert')) merged.invert = cliOptions.invert;
  if (hasOption(cliOptions, 'interpolation')) merged.interpolation = cliOptions.interpolation;
  if (hasOption(cliOptions, 'wideCharRatio')) {
    merged.wideCharRatio = requireFiniteNumber(cliOptions.wideCharRatio, 'wide-char-ratio');
  }
  if (hasOption(cliOptions, 'trimTrailingSpaces')) merged.trimTrailingSpaces = cliOptions.trimTrailingSpaces;
  if (hasOption(cliOptions, 'format')) merged.outputFormat = cliOptions.format;
  if (hasOption(cliOptions, 'outputTarget')) merged.outputTarget = cliOptions.outputTarget;
  if (hasOption(cliOptions, 'imageBackend')) merged.imageBackend = cliOptions.imageBackend;
  if (hasOption(cliOptions, 'textAlign')) merged.textAlign = cliOptions.textAlign;
  if (hasOption(cliOptions, 'lineSpacing')) {
    merged.lineSpacing = requireFiniteNumber(cliOptions.lineSpacing, 'line-spacing');
  }
  if (hasOption(cliOptions, 'heightMode')) merged.heightMode = normalizeHeightMode(cliOptions.heightMode);
  if (hasOption(cliOptions, 'box')) merged.box = parseBoxOption(cliOptions.box);
  if (hasOption(cliOptions, 'lang')) merged.lang = cliOptions.lang;
  if (!hasOption(cliOptions, 'outputTarget')) {
    merged.outputTarget = inferOutputTarget(merged.outputFormat);
  }
  
  return merged;
}

/**
 * 🟢 将CLI配置文件结构规范化为core库ArtConfig结构
 * 
 * @param {Object} fileConfig - 配置文件中的原始配置
 * @returns {Object} core库可直接验证的配置对象
 */
function normalizeConfig(fileConfig = {}) {
  const normalized = {};
  
  if (hasOption(fileConfig, 'height')) normalized.height = fileConfig.height;
  if (hasOption(fileConfig, 'width')) normalized.width = fileConfig.width;
  if (hasOption(fileConfig, 'matrixSize')) normalized.matrixSize = fileConfig.matrixSize;
  if (hasOption(fileConfig, 'ratio')) normalized.ratio = fileConfig.ratio;
  if (hasOption(fileConfig, 'interpolation')) normalized.interpolation = fileConfig.interpolation;
  if (hasOption(fileConfig, 'charset')) normalized.charset = normalizeCharset(fileConfig.charset);
  if (hasOption(fileConfig, 'font')) {
    if (typeof fileConfig.font === 'string') {
      normalized.font = fileConfig.font;
    } else {
      if (hasOption(fileConfig.font, 'name')) normalized.font = fileConfig.font.name;
      if (hasOption(fileConfig.font, 'style')) normalized.fontStyle = normalizeFontStyle(fileConfig.font.style);
      if (hasOption(fileConfig.font, 'reduce')) normalized.fontReduce = fileConfig.font.reduce;
    }
  }
  if (hasOption(fileConfig, 'visualFont')) {
    normalized.visualFont = typeof fileConfig.visualFont === 'string'
      ? { family: fileConfig.visualFont }
      : {
          ...fileConfig.visualFont,
          style: fileConfig.visualFont?.style ? normalizeFontStyle(fileConfig.visualFont.style) : fileConfig.visualFont?.style,
        };
  }
  if (hasOption(fileConfig, 'fontStyle')) normalized.fontStyle = normalizeFontStyle(fileConfig.fontStyle);
  if (hasOption(fileConfig, 'fontReduce')) normalized.fontReduce = fileConfig.fontReduce;
  if (hasOption(fileConfig, 'glyphFont')) {
    normalized.glyphFont = { ...fileConfig.glyphFont };
  }
  if (hasOption(fileConfig, 'glyphFontFamily')) normalized.glyphFontFamily = fileConfig.glyphFontFamily;
  if (hasOption(fileConfig, 'glyphWidthProfile')) normalized.glyphWidthProfile = fileConfig.glyphWidthProfile;
  if (hasOption(fileConfig, 'wideCharRegex')) normalized.wideCharRegex = fileConfig.wideCharRegex;
  if (hasOption(fileConfig, 'charSpace')) normalized.charSpace = fileConfig.charSpace;
  if (hasOption(fileConfig, 'textAlign')) normalized.textAlign = fileConfig.textAlign;
  if (hasOption(fileConfig, 'lineSpacing')) normalized.lineSpacing = fileConfig.lineSpacing;
  if (hasOption(fileConfig, 'heightMode')) normalized.heightMode = normalizeHeightMode(fileConfig.heightMode);
  if (hasOption(fileConfig, 'outputFormat')) normalized.outputFormat = fileConfig.outputFormat;
  if (hasOption(fileConfig, 'outputTarget')) normalized.outputTarget = fileConfig.outputTarget;
  if (hasOption(fileConfig, 'imageBackend')) normalized.imageBackend = fileConfig.imageBackend;
  if (hasOption(fileConfig, 'nodeImageBackend')) normalized.imageBackend = fileConfig.nodeImageBackend;
  if (hasOption(fileConfig, 'invert')) normalized.invert = fileConfig.invert;
  if (hasOption(fileConfig, 'trimTrailingSpaces')) normalized.trimTrailingSpaces = fileConfig.trimTrailingSpaces;
  if (hasOption(fileConfig, 'box')) normalized.box = normalizeBoxConfig(fileConfig.box);
  if (hasOption(fileConfig, 'wideCharRatio')) normalized.wideCharRatio = fileConfig.wideCharRatio;
  if (hasOption(fileConfig, 'enableEarlyTermination')) {
    normalized.enableEarlyTermination = fileConfig.enableEarlyTermination;
  }
  if (hasOption(fileConfig, 'maxParallelTasks')) normalized.maxParallelTasks = fileConfig.maxParallelTasks;
  
  if (fileConfig.size) {
    if (hasOption(fileConfig.size, 'height')) normalized.height = fileConfig.size.height;
    if (hasOption(fileConfig.size, 'width')) normalized.width = fileConfig.size.width;
  }
  if (fileConfig.output) {
    if (hasOption(fileConfig.output, 'format')) normalized.outputFormat = fileConfig.output.format;
    if (hasOption(fileConfig.output, 'target')) normalized.outputTarget = fileConfig.output.target;
    if (hasOption(fileConfig.output, 'trimTrailingSpaces')) {
      normalized.trimTrailingSpaces = fileConfig.output.trimTrailingSpaces;
    }
    if (hasOption(fileConfig.output, 'box')) normalized.box = normalizeBoxConfig(fileConfig.output.box);
  }
  if (fileConfig.image && hasOption(fileConfig.image, 'backend')) {
    normalized.imageBackend = fileConfig.image.backend;
  }
  if (fileConfig.algorithm) {
    if (hasOption(fileConfig.algorithm, 'matrixSize')) normalized.matrixSize = fileConfig.algorithm.matrixSize;
    if (hasOption(fileConfig.algorithm, 'ratio')) normalized.ratio = fileConfig.algorithm.ratio;
    if (hasOption(fileConfig.algorithm, 'interpolation')) normalized.interpolation = fileConfig.algorithm.interpolation;
    if (hasOption(fileConfig.algorithm, 'wideCharRatio')) normalized.wideCharRatio = fileConfig.algorithm.wideCharRatio;
    if (hasOption(fileConfig.algorithm, 'enableEarlyTermination')) {
      normalized.enableEarlyTermination = fileConfig.algorithm.enableEarlyTermination;
    }
  }
  if (fileConfig.color && hasOption(fileConfig.color, 'invert')) normalized.invert = fileConfig.color.invert;
  if (fileConfig.text) {
    if (hasOption(fileConfig.text, 'align')) normalized.textAlign = fileConfig.text.align;
    if (hasOption(fileConfig.text, 'lineSpacing')) normalized.lineSpacing = fileConfig.text.lineSpacing;
    if (hasOption(fileConfig.text, 'heightMode')) normalized.heightMode = normalizeHeightMode(fileConfig.text.heightMode);
  }
  if (fileConfig.performance && hasOption(fileConfig.performance, 'maxParallelTasks')) {
    normalized.maxParallelTasks = fileConfig.performance.maxParallelTasks;
  }
  if (fileConfig.i18n && hasOption(fileConfig.i18n, 'lang')) normalized.lang = fileConfig.i18n.lang;
  if (!normalized.outputTarget) {
    normalized.outputTarget = inferOutputTarget(normalized.outputFormat);
  }
  
  return normalized;
}

/**
 * 🟢 读取文本输入
 *
 * 🔹 当文本参数为 `-` 时，从 stdin 读取内容，便于管道组合。
 *
 * @param {string} text - 命令行文本参数
 * @returns {string} 实际输入文本
 */
function readTextInput(text) {
  if (text !== '-') {
    return text;
  }

  return fs.readFileSync(0, 'utf-8').replace(/\r?\n$/, '');
}

/**
 * 🟢 读取结构化 JSON 输入
 *
 * 🔹 语义文档与 Unicode 艺术字命令均把普通参数解释为文件路径；仅 `-` 从 stdin 读取。
 */
function readStructuredInput(input, label) {
  if (input === '-') {
    return fs.readFileSync(0, 'utf-8');
  }
  if (!fs.existsSync(input)) {
    throw new Error(`${label} file not found: ${input}`);
  }
  return fs.readFileSync(input, 'utf-8');
}

/**
 * 🟢 提取 CLI 运行时配置
 *
 * 🔹 imageBackend 是宿主运行时选择，不属于 Core ArtConfig，验证前需要移出。
 *
 * @param {Object} fullConfig - 合并后的配置对象
 * @returns {{ imageBackend?: string }} 运行时配置
 */
function extractRuntimeConfig(fullConfig) {
  const runtimeConfig = {
    imageBackend: fullConfig.imageBackend
  };

  delete fullConfig.imageBackend;
  delete fullConfig.nodeImageBackend;

  return runtimeConfig;
}

/**
 * 🟢 应用图片后端选择
 *
 * 🔹 默认仍由 Core 决定；当前 Core 默认是 `napi-rs`，`sharp` 仅为 legacy opt-in。
 *
 * @param {string|undefined} backend - Node 图片后端名称
 */
function applyImageBackend(backend) {
  if (!backend) {
    return;
  }

  const capabilities = getCoreCapabilities();
  const availableBackends = capabilities.nodeImageBackends.availableBackends;
  if (!availableBackends.includes(backend)) {
    throw new Error(`Invalid image backend: ${backend}. Expected ${availableBackends.join('|')}`);
  }

  setNodeImageBackend(backend);
}

/**
 * 🟢 规范化字符集配置
 * 
 * @param {Object|string} charsetConfig - 字符集配置
 * @returns {Object} core字符集配置
 */
/**
 * 🔶 解析命令行 box 参数
 *
 * 支持 `true`、`false`、内置样式名和 JSON 对象字符串。
 *
 * @param {string|boolean} value - CLI 输入值
 * @returns {false|Object} core BoxOptions 或 false
 */
function parseBoxOption(value) {
  if (typeof value === 'boolean') {
    return value ? {} : false;
  }

  if (typeof value !== 'string') {
    throw new Error('Invalid box option: expected true, false, style name, or JSON object');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid box option: value cannot be empty');
  }

  if (trimmed === 'true') {
    return {};
  }

  if (trimmed === 'false') {
    return false;
  }

  if (isBoxStyleName(trimmed)) {
    return { enabled: true, style: trimmed };
  }

  if (trimmed.startsWith('{')) {
    try {
      return normalizeBoxConfig(JSON.parse(trimmed));
    } catch (error) {
      throw new Error(`Invalid box option: ${error.message}`);
    }
  }

  throw new Error(
    `Invalid box option: "${trimmed}". Expected true, false, a built-in style, or a JSON object.`
  );
}

/**
 * 🔶 规范化配置文件 box 节点
 *
 * 配置文件可以直接写对象，也允许写 true/false 或样式名。
 *
 * @param {unknown} value - 配置文件 box 值
 * @returns {false|Object} core BoxOptions 或 false
 */
function normalizeBoxConfig(value) {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return parseBoxOption(value);
  }

  if (value === false) {
    return false;
  }

  if (value === true) {
    return {};
  }

  if (value && typeof value === 'object') {
    normalizeBoxOptions(value);
    return value;
  }

  throw new Error('Invalid box config: expected false, true, style name, or object');
}

function normalizeCharset(charsetConfig) {
  if (typeof charsetConfig === 'string') {
    return { type: charsetConfig };
  }
  
  const type = charsetConfig.type || (charsetConfig.customChars ? PresetCharset.CUSTOM : PresetCharset.ASCII);
  return {
    type,
    ...(charsetConfig.customChars ? { customChars: charsetConfig.customChars } : {})
  };
}

/**
 * 🟢 检查对象是否显式提供某个选项
 */
function hasOption(options, key) {
  return options && options[key] !== undefined;
}

/**
 * 🟢 校验数值选项
 */
function requireFiniteNumber(value, optionName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid numeric option: ${optionName}`);
  }
  return value;
}

/**
 * 🟢 兼容旧文档中的normal写法
 */
function normalizeFontStyle(value) {
  return value === 'normal' ? FontStyle.REGULAR : value;
}

/**
 * 🟢 兼容旧文档中的auto/fixed写法
 */
function normalizeHeightMode(value) {
  if (value === 'auto') return HeightMode.LINE;
  if (value === 'fixed') return HeightMode.TOTAL;
  return value;
}

/**
 * 🟢 根据输出格式推断宿主输出目标
 */
function inferOutputTarget(format) {
  if (format === OutputFormat.HTML || format === 'html') return 'html';
  if (format === OutputFormat.ANSI || format === 'ansi') return 'ansi';
  return 'terminal';
}

//#endregion

//#region 🟩 输出处理

/**
 * 🟢 输出结果到文件或终端
 * 
 * @param {Object} result - ArtResult对象
 * @param {string} outputPath - 输出文件路径（可选）
 * @param {boolean} printToTerminal - 是否打印到终端
 * @param {Object} i18n - 翻译对象
 */
async function outputResult(result, outputPath, printToTerminal, i18n) {
  // 如果指定了输出文件，写入文件
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, result.content, 'utf-8');
    console.log(chalk.green(t(i18n, 'commands.output.saved', { path: outputPath })));
  }
  
  // 打印到终端
  if (printToTerminal || !outputPath) {
    console.log('\n' + result.content);
  }
}

//#endregion

//#region 🟩 错误处理

/**
 * 🟢 统一错误处理
 * 
 * @param {Error} error - 错误对象
 * @param {Object} i18n - 翻译对象（可选）
 */
function handleError(error, i18n) {
  const message = i18n && !error.friendly
    ? t(i18n, 'errors.processingFailed', { message: error.message })
    : error.message;
  
  if (error.code) {
    // UnicodeArtError
    console.error(chalk.red(`❌ Error [${error.code}]: ${message}`));
  } else {
    // 其他错误
    console.error(chalk.red(`❌ Error: ${message}`));
    if (process.env.UNICODE_ART_DEBUG) {
      console.error(error.stack);
    }
  }
  
  process.exit(1);
}

//#endregion

// 解析命令行参数
program.parse(process.argv);
