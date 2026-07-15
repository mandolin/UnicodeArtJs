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
 * ============================================================================
 *
 * @lang zh-CN UnicodeArtJs 的命令行入口，负责将命令行参数、配置文件和本地输入安全地归一化为 Core 可消费的转换请求。
 * @lang en UnicodeArtJs command-line entry point that normalizes command arguments, configuration files, and local input into conversion requests consumable by Core.
 *
 * @module @unicode-art/cli
 * @since 1.0.0
 * @license MIT
 * @example
 * unicode-art text "UnicodeArtJs" --height 12 --chars "@#o:. "
 */

const { Command } = require('commander');
const { cosmiconfig } = require('cosmiconfig');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const cliPackage = require('../package.json');

// 导入core库
const {
  evaluateUnicodeArtExtensionCompatibility,
  imageToArt,
  isPermissiveUnicodeArtFontLicense,
  isPermissiveUnicodeArtExtensionLicense,
  parseUnicodeArtExtensionManifestJson,
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
  UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES,
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
 * @lang zh-CN 读取受支持语言的本地翻译字典；语言代码无效或文件缺失时由调用方的错误处理流程接管。
 * @lang en Loads a locale dictionary for a supported language; invalid language codes and missing files are handled by the caller's error flow.
 *
 * @param {string} lang - <lang key="cli.loadLanguage.param.lang"><zh-CN>语言代码，例如 `zh-CN` 或 `en-US`。</zh-CN><en>Locale code, for example `zh-CN` or `en-US`.</en></lang>
 * @returns {Object} <lang key="cli.loadLanguage.returns"><zh-CN>已解析的翻译字典。</zh-CN><en>Parsed translation dictionary.</en></lang>
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
 * @lang zh-CN 解析点分翻译键并替换模板变量；找不到键时返回键本身，使 CLI 错误路径仍然可诊断。
 * @lang en Resolves a dotted translation key and replaces template variables; returns the key itself when missing so CLI error paths remain diagnosable.
 *
 * @param {Object} i18n - <lang key="cli.translate.param.i18n"><zh-CN>翻译字典。</zh-CN><en>Translation dictionary.</en></lang>
 * @param {string} key - <lang key="cli.translate.param.key"><zh-CN>键路径，例如 `commands.image.processing`。</zh-CN><en>Key path, for example `commands.image.processing`.</en></lang>
 * @param {Object} vars - <lang key="cli.translate.param.vars"><zh-CN>用于替换 `{{name}}` 占位符的变量。</zh-CN><en>Variables used to replace `{{name}}` placeholders.</en></lang>
 * @returns {string} <lang key="cli.translate.returns"><zh-CN>可显示的本地化文本。</zh-CN><en>Displayable localized text.</en></lang>
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
 * @lang zh-CN Unicode 艺术字字体的本地检查命令组；只读取本地文件或标准输入，不下载、安装或执行第三方字体资产。
 * @lang en Local inspection command group for Unicode Art Fonts; reads only local files or standard input and never downloads, installs, or executes third-party font assets.
 * @constant {Command}
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

/**
 * 🟢 声明式扩展检查命令组
 *
 * @lang zh-CN UAEM v1 声明式扩展的本地检查命令组；不支持安装、联网下载或执行第三方代码。
 * @lang en Local inspection command group for UAEM v1 declarative extensions; does not install, download, or execute third-party code.
 * @constant {Command}
 */
const extensionCommand = program
  .command('extension')
  .description('Validate local declarative UnicodeArtJs extension manifests');

extensionCommand
  .command('validate')
  .description('Validate a local UAEM manifest and every declared resource')
  .argument('<manifest>', 'Path to unicode-art-extension.json')
  .option('--json', 'Print machine-readable extension summary')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const manifestPath = args[0];
      const command = args[args.length - 1];
      await handleExtensionCommand(manifestPath, getCommandOptions(command), 'validate');
    } catch (error) {
      handleError(error);
    }
  });

extensionCommand
  .command('inspect')
  .description('Inspect a local UAEM manifest without registering it')
  .argument('<manifest>', 'Path to unicode-art-extension.json')
  .option('--json', 'Print machine-readable extension summary')
  .option('--lang <locale>', 'Language (zh-CN|en-US)')
  .action(async (...args) => {
    try {
      const manifestPath = args[0];
      const command = args[args.length - 1];
      await handleExtensionCommand(manifestPath, getCommandOptions(command), 'inspect');
    } catch (error) {
      handleError(error);
    }
  });

//#endregion

//#region 🟩 命令处理函数

/**
 * 🟢 获取Commander解析后的选项
 *
 * @lang zh-CN 兼容 Commander 命令对象与已解析选项对象，避免各子命令重复判断输入形态。
 * @lang en Accepts either a Commander command object or an already parsed options object so subcommands do not repeat input-shape checks.
 *
 * @param {Command|Object} command - <lang key="cli.commandOptions.param.command"><zh-CN>Commander 命令对象或选项对象。</zh-CN><en>Commander command object or options object.</en></lang>
 * @returns {Object} <lang key="cli.commandOptions.returns"><zh-CN>解析后的命令选项。</zh-CN><en>Resolved command options.</en></lang>
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
 * @lang zh-CN 读取图片输入、合并配置、应用 Node 图片后端选择，并将 Core 转换结果输出到文件或终端。
 * @lang en Reads image input, merges configuration, applies the Node image-backend choice, and writes the Core conversion result to a file or terminal.
 *
 * @param {string} input - <lang key="cli.image.param.input"><zh-CN>本地图片文件路径。</zh-CN><en>Local image file path.</en></lang>
 * @param {Object} options - <lang key="cli.image.param.options"><zh-CN>Commander 已解析的图片命令选项。</zh-CN><en>Commander-parsed image command options.</en></lang>
 * @returns {Promise<void>} <lang key="cli.image.returns"><zh-CN>完成输出后兑现的 Promise。</zh-CN><en>Promise fulfilled after output is written.</en></lang>
 * @throws {Error} <lang key="cli.image.throws"><zh-CN>当配置、图片输入、后端或输出路径无效时抛出。</zh-CN><en>Thrown when configuration, image input, backend selection, or output path is invalid.</en></lang>
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
 * @lang zh-CN 读取文本或标准输入、合并配置，并将 Core 文本转换结果输出到文件或终端。
 * @lang en Reads text or standard input, merges configuration, and writes the Core text-conversion result to a file or terminal.
 *
 * @param {string} text - <lang key="cli.text.param.text"><zh-CN>文本参数；`-` 表示从标准输入读取。</zh-CN><en>Text argument; `-` reads from standard input.</en></lang>
 * @param {Object} options - <lang key="cli.text.param.options"><zh-CN>Commander 已解析的文本命令选项。</zh-CN><en>Commander-parsed text command options.</en></lang>
 * @returns {Promise<void>} <lang key="cli.text.returns"><zh-CN>完成输出后兑现的 Promise。</zh-CN><en>Promise fulfilled after output is written.</en></lang>
 * @throws {Error} <lang key="cli.text.throws"><zh-CN>当配置、文本输入或输出路径无效时抛出。</zh-CN><en>Thrown when configuration, text input, or output path is invalid.</en></lang>
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
 * @lang zh-CN 读取 canonical JSON 或显式 DSL 语义文档，并将其交给 Core 渲染；字素宽度与布局语义由 Core 统一处理。
 * @lang en Reads a canonical JSON or explicitly selected DSL semantic document and renders it through Core; glyph width and layout semantics remain centralized in Core.
 *
 * @param {string} input - <lang key="cli.document.param.input"><zh-CN>文档路径；`-` 表示标准输入。</zh-CN><en>Document path; `-` means standard input.</en></lang>
 * @param {Object} options - <lang key="cli.document.param.options"><zh-CN>文档命令选项，包括 format 与分隔符设置。</zh-CN><en>Document command options, including format and separator settings.</en></lang>
 * @returns {Promise<void>} <lang key="cli.document.returns"><zh-CN>完成渲染与输出后兑现的 Promise。</zh-CN><en>Promise fulfilled after rendering and output complete.</en></lang>
 * @throws {Error} <lang key="cli.document.throws"><zh-CN>当文档格式、配置或输出无效时抛出。</zh-CN><en>Thrown when document format, configuration, or output is invalid.</en></lang>
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
 * @lang zh-CN 校验或查看本地 UAF 文档；许可证策略结果只是官方随包候选的机器判断，不构成法律意见。
 * @lang en Validates or inspects a local UAF document; license-policy results are machine checks for official-bundle candidacy and are not legal advice.
 *
 * @param {string} input - <lang key="cli.artFont.param.input"><zh-CN>UAF JSON 路径；`-` 表示标准输入。</zh-CN><en>UAF JSON path; `-` means standard input.</en></lang>
 * @param {Object} options - <lang key="cli.artFont.param.options"><zh-CN>字体命令选项。</zh-CN><en>Font command options.</en></lang>
 * @param {string} operation - <lang key="cli.artFont.param.operation"><zh-CN>`validate` 或 `inspect` 操作名。</zh-CN><en>`validate` or `inspect` operation name.</en></lang>
 * @returns {Promise<void>} <lang key="cli.artFont.returns"><zh-CN>完成校验或查看输出后兑现的 Promise。</zh-CN><en>Promise fulfilled after validation or inspection output.</en></lang>
 * @throws {Error} <lang key="cli.artFont.throws"><zh-CN>当 UAF 文档或操作参数不符合格式时抛出。</zh-CN><en>Thrown when the UAF document or operation arguments violate the format.</en></lang>
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

/**
 * 🟢 检查本地 UAEM 扩展包
 *
 * @lang zh-CN 校验或查看本地 UAEM 清单及其声明资源；属于开发者侧载预检，不会安装、注册或执行扩展代码。
 * @lang en Validates or inspects a local UAEM manifest and declared resources; this is a developer side-load preflight and never installs, registers, or executes extension code.
 *
 * @param {string} input - <lang key="cli.extension.param.input"><zh-CN>本地 `unicode-art-extension.json` 路径；不接受标准输入。</zh-CN><en>Local `unicode-art-extension.json` path; standard input is not accepted.</en></lang>
 * @param {Object} options - <lang key="cli.extension.param.options"><zh-CN>扩展命令选项。</zh-CN><en>Extension command options.</en></lang>
 * @param {string} operation - <lang key="cli.extension.param.operation"><zh-CN>`validate` 或 `inspect` 操作名。</zh-CN><en>`validate` or `inspect` operation name.</en></lang>
 * @returns {Promise<void>} <lang key="cli.extension.returns"><zh-CN>完成清单与资源预检后兑现的 Promise。</zh-CN><en>Promise fulfilled after manifest and resource preflight.</en></lang>
 * @throws {Error} <lang key="cli.extension.throws"><zh-CN>当清单、资源、兼容性或真实路径校验失败时抛出。</zh-CN><en>Thrown when manifest, resource, compatibility, or real-path validation fails.</en></lang>
 */
async function handleExtensionCommand(input, options, operation) {
  const lang = options.lang || 'zh-CN';
  const i18n = loadLanguage(lang);
  if (input === '-') {
    throw new Error('Extension manifest must be a local file path; stdin has no trusted resource root');
  }
  if (!fs.existsSync(input)) {
    throw new Error('Extension manifest file not found: ' + input);
  }

  const manifestPath = fs.realpathSync(input);
  const extensionRoot = path.dirname(manifestPath);
  const manifest = parseUnicodeArtExtensionManifestJson(fs.readFileSync(manifestPath, 'utf-8'), { locale: lang });
  const compatibility = evaluateUnicodeArtExtensionCompatibility(manifest, {
    target: 'cli',
    coreVersion: getCoreCapabilities().version,
    capabilities: UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES
  });
  const resources = manifest.resources.map((resource) =>
    inspectExtensionResource(extensionRoot, resource, lang)
  );
  const summary = {
    format: manifest.format,
    version: manifest.version,
    id: manifest.meta.id,
    name: manifest.meta.name,
    authors: manifest.meta.authors,
    license: manifest.meta.license.expression,
    origin: manifest.meta.license.origin,
    capabilities: manifest.capabilities,
    compatibility,
    permissiveForOfficialBundle: isPermissiveUnicodeArtExtensionLicense(manifest.meta.license.expression),
    resources
  };

  if (operation === 'validate' && !compatibility.compatible) {
    throw new Error(t(i18n, 'commands.extension.incompatible', {
      reasons: compatibility.reasons.map((reason) => reason.code + ':' + reason.value).join(', ')
    }));
  }
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (operation === 'validate') {
    console.log(chalk.green(t(i18n, 'commands.extension.valid')));
  }
  console.log(chalk.blue(t(i18n, 'commands.extension.summary', {
    name: summary.name,
    id: summary.id,
    resources: resources.length
  })));
  console.log(chalk.gray(t(i18n, 'commands.extension.compatibility', {
    compatible: compatibility.compatible ? t(i18n, 'commands.extension.compatible') : t(i18n, 'commands.extension.incompatibleLabel')
  })));
  for (const resource of resources) {
    console.log(chalk.gray('  - ' + resource.id + ' [' + resource.kind + '] ' + resource.path));
  }
}

/**
 * 🟢 在扩展根目录内读取并预检一个声明式资源
 *
 * @lang zh-CN 在清单根目录内读取单个已声明资源，并用真实路径检查防御符号链接逃逸后交给 Core 解析。
 * @lang en Reads one declared resource inside the manifest root, defends against symlink escapes with a real-path check, then delegates parsing to Core.
 *
 * @param {string} extensionRoot - <lang key="cli.extensionResource.param.root"><zh-CN>已 realpath 的清单所在目录。</zh-CN><en>Realpath-resolved manifest directory.</en></lang>
 * @param {{id: string, kind: string, path: string}} resource - <lang key="cli.extensionResource.param.resource"><zh-CN>已由 Core 校验的资源声明。</zh-CN><en>Resource declaration already validated by Core.</en></lang>
 * @param {string} lang - <lang key="cli.extensionResource.param.lang"><zh-CN>Core 错误消息语言。</zh-CN><en>Locale used for Core error messages.</en></lang>
 * @returns {{id: string, kind: string, path: string, summary: Object}} <lang key="cli.extensionResource.returns"><zh-CN>只含摘要的已校验资源信息。</zh-CN><en>Validated resource information containing summary data only.</en></lang>
 * @throws {Error} <lang key="cli.extensionResource.throws"><zh-CN>当资源路径越界、文件不可读或资源内容无效时抛出。</zh-CN><en>Thrown when the resource escapes the root, cannot be read, or has invalid content.</en></lang>
 */
function inspectExtensionResource(extensionRoot, resource, lang) {
  const candidate = path.resolve(extensionRoot, ...resource.path.split('/'));
  const resourcePath = fs.realpathSync(candidate);
  assertExtensionResourceInsideRoot(extensionRoot, resourcePath, resource.path);
  const source = fs.readFileSync(resourcePath, 'utf-8');

  if (resource.kind === 'unicode-art-font') {
    const font = parseUnicodeArtFontJson(source, { locale: lang });
    return {
      id: resource.id,
      kind: resource.kind,
      path: resource.path,
      summary: {
        id: font.meta.id,
        glyphs: Object.keys(font.glyphs).length,
        height: font.metrics.height,
        permissiveForOfficialBundle: isPermissiveUnicodeArtFontLicense(font.meta.license.expression)
      }
    };
  }

  const document = parseSemanticDocumentJson(source, { locale: lang });
  return {
    id: resource.id,
    kind: resource.kind,
    path: resource.path,
    summary: { version: document.version, rows: document.rows.length }
  };
}

/**
 * 🟢 复核资源真实路径仍在扩展根目录内
 *
 * @lang zh-CN 复核资源真实路径仍位于扩展根目录；即使 Core 已拒绝 `..`，此处仍防御符号链接离开扩展目录。
 * @lang en Verifies that a resource real path remains inside the extension root; even after Core rejects `..`, this guards against symlinks leaving the extension directory.
 *
 * @param {string} extensionRoot - <lang key="cli.extensionPath.param.root"><zh-CN>已 realpath 的扩展根目录。</zh-CN><en>Realpath-resolved extension root.</en></lang>
 * @param {string} resourcePath - <lang key="cli.extensionPath.param.resourcePath"><zh-CN>候选资源的真实路径。</zh-CN><en>Real path of the candidate resource.</en></lang>
 * @param {string} declaredPath - <lang key="cli.extensionPath.param.declaredPath"><zh-CN>清单中的原始相对路径，用于诊断。</zh-CN><en>Original manifest-relative path for diagnostics.</en></lang>
 * @returns {void} <lang key="cli.extensionPath.returns"><zh-CN>路径安全时不返回值。</zh-CN><en>Returns no value when the path is safe.</en></lang>
 * @throws {Error} <lang key="cli.extensionPath.throws"><zh-CN>当真实路径离开扩展根目录时抛出。</zh-CN><en>Thrown when the real path leaves the extension root.</en></lang>
 */
function assertExtensionResourceInsideRoot(extensionRoot, resourcePath, declaredPath) {
  const root = extensionRoot.endsWith(path.sep) ? extensionRoot : extensionRoot + path.sep;
  if (!resourcePath.startsWith(root)) {
    throw new Error('Extension resource escapes manifest root: ' + declaredPath);
  }
}

//#endregion

//#region 🟩 配置管理

/**
 * 🟢 加载配置文件
 *
 * @lang zh-CN 按显式路径或 cosmiconfig 规则读取 CLI 配置；`false` 禁用自动发现并返回空对象。
 * @lang en Loads CLI configuration from an explicit path or cosmiconfig discovery; `false` disables discovery and returns an empty object.
 *
 * @param {string|false|undefined} configPath - <lang key="cli.loadConfig.param.path"><zh-CN>显式配置路径、`false` 或未指定。</zh-CN><en>Explicit configuration path, `false`, or omitted.</en></lang>
 * @returns {Promise<Object>} <lang key="cli.loadConfig.returns"><zh-CN>配置文件对象或空对象。</zh-CN><en>Configuration-file object or an empty object.</en></lang>
 * @throws {Error} <lang key="cli.loadConfig.throws"><zh-CN>当显式配置文件无法读取或解析时抛出。</zh-CN><en>Thrown when an explicit configuration file cannot be read or parsed.</en></lang>
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
 * @lang zh-CN 按“命令行选项优先于配置文件”的顺序合并并规范化配置，同时补齐 CLI 所需的默认尺寸。
 * @lang en Merges and normalizes configuration with command-line options taking precedence over file values, while filling CLI-required default dimensions.
 *
 * @param {Object} fileConfig - <lang key="cli.mergeConfig.param.fileConfig"><zh-CN>配置文件中的原始对象。</zh-CN><en>Raw object read from the configuration file.</en></lang>
 * @param {Object} cliOptions - <lang key="cli.mergeConfig.param.cliOptions"><zh-CN>Commander 已解析的选项。</zh-CN><en>Commander-parsed options.</en></lang>
 * @returns {Object} <lang key="cli.mergeConfig.returns"><zh-CN>可交给 Core 校验的合并配置。</zh-CN><en>Merged configuration ready for Core validation.</en></lang>
 * @throws {Error} <lang key="cli.mergeConfig.throws"><zh-CN>当显式数值选项不是有限数字或 Box 选项无效时抛出。</zh-CN><en>Thrown when an explicit numeric option is not finite or a Box option is invalid.</en></lang>
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
 * @lang zh-CN 将 CLI 配置中的别名、Box 节点和宿主输出选项归一化，再交给 Core 执行统一校验。
 * @lang en Normalizes CLI aliases, Box nodes, and host output options before Core performs its shared validation.
 *
 * @param {Object} fileConfig - <lang key="cli.normalizeConfig.param.fileConfig"><zh-CN>配置文件中的原始对象。</zh-CN><en>Raw object read from the configuration file.</en></lang>
 * @returns {Object} <lang key="cli.normalizeConfig.returns"><zh-CN>可直接交给 Core 校验的配置对象。</zh-CN><en>Configuration object ready for Core validation.</en></lang>
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
 * @lang zh-CN 返回文本参数；当参数为 `-` 时从标准输入读取并移除末尾单个换行，便于管道组合。
 * @lang en Returns the text argument; when it is `-`, reads standard input and removes one trailing newline for pipeline composition.
 *
 * @param {string} text - <lang key="cli.readText.param.text"><zh-CN>文本参数或标准输入标记 `-`。</zh-CN><en>Text argument or standard-input marker `-`.</en></lang>
 * @returns {string} <lang key="cli.readText.returns"><zh-CN>实际参与转换的文本。</zh-CN><en>Text that actually participates in conversion.</en></lang>
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
 * @lang zh-CN 读取语义文档或 UAF 的 JSON 文本；普通参数必须是文件路径，只有 `-` 允许从标准输入读取。
 * @lang en Reads JSON text for a semantic document or UAF; ordinary arguments must be file paths and only `-` allows standard-input reading.
 *
 * @param {string} input - <lang key="cli.readStructured.param.input"><zh-CN>文件路径或标准输入标记 `-`。</zh-CN><en>File path or standard-input marker `-`.</en></lang>
 * @param {string} label - <lang key="cli.readStructured.param.label"><zh-CN>错误消息中的输入类别名称。</zh-CN><en>Input-kind name used in error messages.</en></lang>
 * @returns {string} <lang key="cli.readStructured.returns"><zh-CN>未解析的结构化 JSON 文本。</zh-CN><en>Unparsed structured JSON text.</en></lang>
 * @throws {Error} <lang key="cli.readStructured.throws"><zh-CN>当指定文件不存在时抛出。</zh-CN><en>Thrown when a specified file does not exist.</en></lang>
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
 * @lang zh-CN 从合并配置中移出 CLI 宿主运行时字段；`imageBackend` 不属于 Core `ArtConfig`，必须在 Core 校验前处理。
 * @lang en Removes CLI host-runtime fields from merged configuration; `imageBackend` is not part of Core `ArtConfig` and must be handled before Core validation.
 *
 * @param {Object} fullConfig - <lang key="cli.extractRuntimeConfig.param.fullConfig"><zh-CN>会被原地移除运行时字段的合并配置对象。</zh-CN><en>Merged configuration object whose runtime fields are removed in place.</en></lang>
 * @returns {Object} <lang key="cli.extractRuntimeConfig.returns"><zh-CN>运行时配置；指定时包含 `imageBackend`。</zh-CN><en>Runtime configuration; includes `imageBackend` when it was specified.</en></lang>
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
 * @lang zh-CN 校验并应用 CLI 请求的 Node 图片后端；未指定时保持 Core 默认 `napi-rs`，`sharp` 仅为 legacy opt-in。
 * @lang en Validates and applies the Node image backend requested by the CLI; when omitted Core keeps the `napi-rs` default, while `sharp` remains legacy opt-in.
 *
 * @param {string|undefined} backend - <lang key="cli.imageBackend.param.backend"><zh-CN>请求的 Node 图片后端名称。</zh-CN><en>Requested Node image backend name.</en></lang>
 * @returns {void} <lang key="cli.imageBackend.returns"><zh-CN>后端合法时不返回值。</zh-CN><en>Returns no value when the backend is valid.</en></lang>
 * @throws {Error} <lang key="cli.imageBackend.throws"><zh-CN>当后端名称不在 Core 当前能力清单中时抛出。</zh-CN><en>Thrown when the backend name is absent from the current Core capability list.</en></lang>
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
 * @lang zh-CN 将 `--box` 的布尔值、内置样式名或 JSON 字符串转换为 Core 的 BoxOptions；非法 JSON 会抛出可定位的参数错误。
 * @lang en Converts the boolean, built-in style name, or JSON string supplied to `--box` into Core BoxOptions; invalid JSON throws a locatable argument error.
 *
 * @param {string|boolean} value - <lang key="cli.parseBox.param.value"><zh-CN>CLI 传入的 box 值。</zh-CN><en>Box value supplied by the CLI.</en></lang>
 * @returns {false|Object} <lang key="cli.parseBox.returns"><zh-CN>Core `BoxOptions` 或 `false`。</zh-CN><en>Core `BoxOptions` or `false`.</en></lang>
 * @throws {Error} <lang key="cli.parseBox.throws"><zh-CN>当 JSON 解析失败或输入不是受支持的布尔值、样式名或对象时抛出。</zh-CN><en>Thrown when JSON parsing fails or input is not a supported boolean, style name, or object.</en></lang>
 * @example
 * parseBoxOption('{"style":"round","padding":1}')
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
 * @lang zh-CN 将配置文件中的 Box 节点规范化为 Core `BoxOptions` 或 `false`；允许对象、布尔值和内置样式名。
 * @lang en Normalizes a Box node from a configuration file into Core `BoxOptions` or `false`; accepts an object, boolean, or built-in style name.
 *
 * @param {unknown} value - <lang key="cli.normalizeBox.param.value"><zh-CN>配置文件中的 Box 值。</zh-CN><en>Box value from a configuration file.</en></lang>
 * @returns {false|Object} <lang key="cli.normalizeBox.returns"><zh-CN>Core `BoxOptions` 或 `false`。</zh-CN><en>Core `BoxOptions` or `false`.</en></lang>
 * @throws {Error} <lang key="cli.normalizeBox.throws"><zh-CN>当值不是受支持的 Box 配置形态时抛出。</zh-CN><en>Thrown when the value is not a supported Box-configuration shape.</en></lang>
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

/**
 * 🟢 规范化字符集配置
 *
 * @lang zh-CN 兼容字符集字符串与对象写法，并在缺失类型时按自定义字符或 ASCII 默认值推断 Core 字符集配置。
 * @lang en Accepts string and object charset forms, inferring the Core charset configuration from custom characters or the ASCII default when type is absent.
 *
 * @param {string|Object} charsetConfig - <lang key="cli.normalizeCharset.param.charset"><zh-CN>配置文件中的字符集值。</zh-CN><en>Charset value from a configuration file.</en></lang>
 * @returns {Object} <lang key="cli.normalizeCharset.returns"><zh-CN>带有 type 及可选 customChars 的 Core 字符集对象。</zh-CN><en>Core charset object with type and optional customChars.</en></lang>
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
 *
 * @lang zh-CN 判断选项键是否存在且不是 `undefined`，用于区分“未指定”与可覆盖的显式值。
 * @lang en Determines whether an option key exists with a value other than `undefined`, distinguishing omission from an explicit overridable value.
 *
 * @param {Object|undefined} options - <lang key="cli.hasOption.param.options"><zh-CN>待检查的选项对象。</zh-CN><en>Options object to inspect.</en></lang>
 * @param {string} key - <lang key="cli.hasOption.param.key"><zh-CN>选项键。</zh-CN><en>Option key.</en></lang>
 * @returns {boolean} <lang key="cli.hasOption.returns"><zh-CN>键已显式提供时为 true。</zh-CN><en>True when the key was explicitly provided.</en></lang>
 */
function hasOption(options, key) {
  return options && options[key] !== undefined;
}

/**
 * 🟢 校验数值选项
 *
 * @lang zh-CN 要求 CLI 已解析数值为有限 number，避免 `NaN` 或 Infinity 进入 Core 配置。
 * @lang en Requires a parsed CLI numeric value to be a finite number, preventing `NaN` or Infinity from entering Core configuration.
 *
 * @param {unknown} value - <lang key="cli.requireNumber.param.value"><zh-CN>待校验值。</zh-CN><en>Value to validate.</en></lang>
 * @param {string} optionName - <lang key="cli.requireNumber.param.optionName"><zh-CN>用于错误消息的选项名称。</zh-CN><en>Option name used in the error message.</en></lang>
 * @returns {number} <lang key="cli.requireNumber.returns"><zh-CN>已校验的有限数值。</zh-CN><en>Validated finite number.</en></lang>
 * @throws {Error} <lang key="cli.requireNumber.throws"><zh-CN>当值不是有限数字时抛出。</zh-CN><en>Thrown when the value is not a finite number.</en></lang>
 */
function requireFiniteNumber(value, optionName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid numeric option: ${optionName}`);
  }
  return value;
}

/**
 * 🟢 兼容旧文档中的normal写法
 *
 * @lang zh-CN 将旧配置的 `normal` 字体样式别名归一为当前 `regular` 枚举值。
 * @lang en Normalizes the legacy `normal` font-style alias into the current `regular` enum value.
 *
 * @param {string|undefined} value - <lang key="cli.fontStyle.param.value"><zh-CN>原始字体样式值。</zh-CN><en>Raw font-style value.</en></lang>
 * @returns {string|undefined} <lang key="cli.fontStyle.returns"><zh-CN>归一化后的字体样式值。</zh-CN><en>Normalized font-style value.</en></lang>
 */
function normalizeFontStyle(value) {
  return value === 'normal' ? FontStyle.REGULAR : value;
}

/**
 * 🟢 兼容旧文档中的auto/fixed写法
 *
 * @lang zh-CN 将旧配置的 `auto` 与 `fixed` 高度模式别名归一为当前 line/total 语义。
 * @lang en Normalizes legacy `auto` and `fixed` height-mode aliases into current line/total semantics.
 *
 * @param {string|undefined} value - <lang key="cli.heightMode.param.value"><zh-CN>原始高度模式值。</zh-CN><en>Raw height-mode value.</en></lang>
 * @returns {string|undefined} <lang key="cli.heightMode.returns"><zh-CN>归一化后的高度模式值。</zh-CN><en>Normalized height-mode value.</en></lang>
 */
function normalizeHeightMode(value) {
  if (value === 'auto') return HeightMode.LINE;
  if (value === 'fixed') return HeightMode.TOTAL;
  return value;
}

/**
 * 🟢 根据输出格式推断宿主输出目标
 *
 * @lang zh-CN 根据 HTML、ANSI 或默认纯文本格式推断宿主输出目标，供 Core 记录跨端配置语义。
 * @lang en Infers the host output target from HTML, ANSI, or default plain-text format so Core can retain cross-surface configuration semantics.
 *
 * @param {string|undefined} format - <lang key="cli.outputTarget.param.format"><zh-CN>请求的输出格式。</zh-CN><en>Requested output format.</en></lang>
 * @returns {string} <lang key="cli.outputTarget.returns"><zh-CN>`html`、`ansi` 或 `terminal` 输出目标。</zh-CN><en>`html`, `ansi`, or `terminal` output target.</en></lang>
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
 * @lang zh-CN 将已完成的字符画结果写入可选文件并按请求打印到终端；目录不存在时仅为显式输出路径创建父目录。
 * @lang en Writes a completed Unicode-art result to an optional file and prints it to the terminal when requested; creates parent directories only for an explicit output path.
 *
 * @param {Object} result - <lang key="cli.outputResult.param.result"><zh-CN>包含 content、rows、cols 和 duration 的转换结果。</zh-CN><en>Conversion result containing content, rows, cols, and duration.</en></lang>
 * @param {string|undefined} outputPath - <lang key="cli.outputResult.param.outputPath"><zh-CN>可选输出文件路径。</zh-CN><en>Optional output file path.</en></lang>
 * @param {boolean} printToTerminal - <lang key="cli.outputResult.param.print"><zh-CN>是否同时打印到终端。</zh-CN><en>Whether to print to the terminal as well.</en></lang>
 * @param {Object} i18n - <lang key="cli.outputResult.param.i18n"><zh-CN>用于进度和完成消息的翻译字典。</zh-CN><en>Translation dictionary for progress and completion messages.</en></lang>
 * @returns {Promise<void>} <lang key="cli.outputResult.returns"><zh-CN>写入和打印完成后兑现的 Promise。</zh-CN><en>Promise fulfilled after writing and printing complete.</en></lang>
 * @throws {Error} <lang key="cli.outputResult.throws"><zh-CN>当输出路径不可创建或写入失败时抛出。</zh-CN><en>Thrown when an output path cannot be created or written.</en></lang>
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
 * @lang zh-CN 将 Core 结构化错误或普通异常格式化为 CLI 终端输出；保留错误码，避免调用方只能依赖人类可读文本。
 * @lang en Formats Core structured errors or ordinary exceptions for CLI terminal output; preserves error codes so callers need not rely only on human-readable text.
 *
 * @param {Error} error - <lang key="cli.handleError.param.error"><zh-CN>待呈现的异常。</zh-CN><en>Exception to present.</en></lang>
 * @param {Object|undefined} i18n - <lang key="cli.handleError.param.i18n"><zh-CN>可选的翻译字典。</zh-CN><en>Optional translation dictionary.</en></lang>
 * @returns {void} <lang key="cli.handleError.returns"><zh-CN>向标准错误输出后不返回值。</zh-CN><en>Returns no value after writing to standard error.</en></lang>
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
