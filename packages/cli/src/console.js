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
 * @author Qoder
 * @since 1.0.0
 * @license MIT
 * ============================================================================
 */

const { Command } = require('commander');
const { cosmiconfig } = require('cosmiconfig');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// 导入core库
const {
  imageToArt,
  textToArt,
  validateConfig,
  OutputFormat,
  PresetCharset,
  Interpolation,
  FontStyle,
  TextAlign,
  HeightMode
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
  .version('1.0.0')
  .option('-i, --image <path>', 'Convert image file to character art')
  .option('-t, --text <text>', 'Convert text to character art')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --print [mode]', 'Print to terminal when output file is set (spec|all|debug)')
  .option('-e, --height <number>', 'Output height in rows', parseInt)
  .option('-w, --width <number>', 'Output width in columns', parseInt)
  .option('-a, --chars <string>', 'Custom character set')
  .option('--charset <type>', 'Preset charset (ASCII|EXTENDED|CHINESE_SIMPLE)')
  .option('-f, --font <name>', 'Font name or path')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Font size reduction', parseInt)
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
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
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
  .option('-f, --font <name>', 'Font name or path')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Font size reduction', parseInt)
  .option('-m, --matrix <size>', 'Matrix size', parseInt)
  .option('-r, --ratio <number>', 'Vertical/horizontal ratio', parseFloat)
  .option('-v, --invert', 'Invert colors')
  .option('--interpolation <type>', 'Interpolation algorithm (nearest|bilinear|bicubic|lanczos)')
  .option('--wide-char-ratio <number>', 'Wide character matching ratio', parseFloat)
  .option('--trim-trailing-spaces', 'Trim trailing spaces')
  .option('--format <format>', 'Output format (plain|html|ansi)')
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
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
  .option('-f, --font <name>', 'Font name or path')
  .option('--font-style <style>', 'Font style (regular|bold|italic|bold-italic)')
  .option('--font-reduce <number>', 'Font size reduction', parseInt)
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
  .option('-d, --debug <tags>', 'Debug tags, comma separated')
  .option('-c, --config <path>', 'Config file path')
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
  
  // 验证配置
  const validatedConfig = validateConfig(fullConfig);
  
  console.log(chalk.blue(t(i18n, 'commands.image.processing')));
  const startTime = Date.now();
  
  try {
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
  
  // 加载语言（命令行 > 配置文件 > 默认）
  const lang = options.lang || config.i18n?.lang || config.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  
  // 合并配置
  const fullConfig = mergeConfig(config, options);
  
  // 验证配置
  const validatedConfig = validateConfig(fullConfig);
  
  console.log(chalk.blue(t(i18n, 'commands.text.processing')));
  const startTime = Date.now();
  
  try {
    // 调用core库
    const result = await textToArt(text, validatedConfig);
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(t(i18n, 'commands.text.completed', { duration })));
    console.log(chalk.gray(t(i18n, 'commands.text.size', { rows: result.rows, cols: result.cols })));
    
    // 输出结果
    await outputResult(result, options.output, options.print, i18n);
  } catch (error) {
    handleError(error, i18n);
  }
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
  if (hasOption(cliOptions, 'fontStyle')) merged.fontStyle = normalizeFontStyle(cliOptions.fontStyle);
  if (hasOption(cliOptions, 'fontReduce')) {
    merged.fontReduce = requireFiniteNumber(cliOptions.fontReduce, 'font-reduce');
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
  if (hasOption(cliOptions, 'textAlign')) merged.textAlign = cliOptions.textAlign;
  if (hasOption(cliOptions, 'lineSpacing')) {
    merged.lineSpacing = requireFiniteNumber(cliOptions.lineSpacing, 'line-spacing');
  }
  if (hasOption(cliOptions, 'heightMode')) merged.heightMode = normalizeHeightMode(cliOptions.heightMode);
  if (hasOption(cliOptions, 'lang')) merged.lang = cliOptions.lang;
  
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
  if (hasOption(fileConfig, 'fontStyle')) normalized.fontStyle = normalizeFontStyle(fileConfig.fontStyle);
  if (hasOption(fileConfig, 'fontReduce')) normalized.fontReduce = fileConfig.fontReduce;
  if (hasOption(fileConfig, 'charSpace')) normalized.charSpace = fileConfig.charSpace;
  if (hasOption(fileConfig, 'textAlign')) normalized.textAlign = fileConfig.textAlign;
  if (hasOption(fileConfig, 'lineSpacing')) normalized.lineSpacing = fileConfig.lineSpacing;
  if (hasOption(fileConfig, 'heightMode')) normalized.heightMode = normalizeHeightMode(fileConfig.heightMode);
  if (hasOption(fileConfig, 'outputFormat')) normalized.outputFormat = fileConfig.outputFormat;
  if (hasOption(fileConfig, 'invert')) normalized.invert = fileConfig.invert;
  if (hasOption(fileConfig, 'trimTrailingSpaces')) normalized.trimTrailingSpaces = fileConfig.trimTrailingSpaces;
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
    if (hasOption(fileConfig.output, 'trimTrailingSpaces')) {
      normalized.trimTrailingSpaces = fileConfig.output.trimTrailingSpaces;
    }
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
  
  return normalized;
}

/**
 * 🟢 规范化字符集配置
 * 
 * @param {Object|string} charsetConfig - 字符集配置
 * @returns {Object} core字符集配置
 */
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
