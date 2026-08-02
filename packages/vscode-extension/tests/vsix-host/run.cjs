/**
 * @lang zh-CN
 * 在真实 VS Code Extension Host 中验证从隔离 extensions-dir 加载的已安装 VSIX。
 *
 * VS Code 测试模式会关闭普通已安装扩展，因此调用方把 development-path 指向 CLI 实际解包目录；
 * 产品扩展必须位于该目录，结果不记录任何路径、文档正文、日志正文或用户状态。
 * @lang en
 * Validate a VSIX loaded from an isolated extensions directory in a real VS Code Extension Host.
 *
 * VS Code test mode disables normally installed extensions, so the caller points the development
 * path at the CLI-unpacked directory. The product must live there, and results record no paths,
 * document bodies, logs, or user state.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

const EXTENSION_ID = 'mandolin.unicode-art-js-vscode';
const EXPECTED_COMMANDS = [
  'unicodeArtJs.openConverter',
  'unicodeArtJs.convertSelection',
  'unicodeArtJs.convertSelectionWithOptions',
  'unicodeArtJs.generateWithDefaultTemplate',
  'unicodeArtJs.generateWithTemplate1',
  'unicodeArtJs.generateWithTemplate2',
  'unicodeArtJs.generateWithTemplate3',
  'unicodeArtJs.convertImageFile',
  'unicodeArtJs.openSettings',
  'unicodeArtJs.saveCurrentPreset'
];

/**
 * @lang zh-CN
 * 执行已安装 VSIX 的宿主 smoke，并写出仅含公共版本、计数和布尔值的结果。
 * @lang en
 * Run the installed-VSIX host smoke and write a result containing only public versions, counts,
 * and booleans.
 *
 * @returns {Promise<void>}
 */
async function run() {
  const resultPath = process.env.UNICODE_ART_HOST_RESULT_PATH;
  const installedRoot = process.env.UNICODE_ART_INSTALLED_EXTENSION_ROOT;
  if (!resultPath || !installedRoot) {
    throw new Error('UNICODE_ART_HOST_RESULT_PATH and UNICODE_ART_INSTALLED_EXTENSION_ROOT are required.');
  }

  const result = {
    schema: 'unicodeartjs-vscode-vsix-installed-host@0',
    status: 'failed',
    host: {
      vscodeVersion: vscode.version,
      appHost: vscode.env.appHost,
      uiKind: vscode.env.uiKind === vscode.UIKind.Desktop ? 'desktop' : 'web',
      remoteName: vscode.env.remoteName ?? null,
      workspaceTrusted: vscode.workspace.isTrusted,
      runtime: {
        node: process.versions.node,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        modules: process.versions.modules
      }
    },
    extension: {
      id: EXTENSION_ID,
      version: null,
      active: false,
      loadedFromInstalledDirectory: false
    },
    commands: { expected: EXPECTED_COMMANDS.length, visible: 0, missing: EXPECTED_COMMANDS.length },
    configuration: { contributed: 0, resolved: 0 },
    flows: { selectionConversion: false, converterPanel: false },
    boundaries: {
      isolatedUserData: true,
      isolatedExtensionsDirectory: true,
      temporaryWorkspace: true,
      vsixInstalled: true,
      productExtensionDevelopmentMode: true,
      networkRequestedByHarness: false,
      userFileReadByHarness: false
    }
  };

  try {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `Extension not found: ${EXTENSION_ID}`);
    result.extension.version = extension.packageJSON.version;

    // <lang><zh-CN>Windows 比较忽略大小写；其它平台仍保持区分，且只输出布尔结论。</zh-CN><en>Windows comparison is case-insensitive while other platforms remain case-sensitive, and only the boolean conclusion is emitted.</en></lang>
    const actualRoot = normalizeForPlatform(path.resolve(extension.extensionPath));
    const expectedRoot = normalizeForPlatform(path.resolve(installedRoot));
    result.extension.loadedFromInstalledDirectory = actualRoot === expectedRoot;
    assert.equal(result.extension.loadedFromInstalledDirectory, true, 'Product extension must load from the isolated installed directory.');

    await extension.activate();
    result.extension.active = extension.isActive;
    assert.equal(extension.isActive, true, 'Installed extension must be active after activation.');

    // <lang><zh-CN>命令和配置断言来自已安装扩展在真实 host 中的注册结果，不重复解析源仓 manifest。</zh-CN><en>Command and configuration assertions come from the installed extension's real host registration, not from reparsing the source manifest.</en></lang>
    const visibleCommands = new Set(await vscode.commands.getCommands(true));
    const missingCommands = EXPECTED_COMMANDS.filter((command) => !visibleCommands.has(command));
    result.commands.visible = EXPECTED_COMMANDS.length - missingCommands.length;
    result.commands.missing = missingCommands.length;
    assert.deepEqual(missingCommands, [], 'All installed extension commands must be registered.');

    const contributedProperties = extension.packageJSON.contributes.configuration.properties;
    const contributedKeys = Object.keys(contributedProperties);
    const configuration = vscode.workspace.getConfiguration('unicodeArtJs');
    const unresolvedKeys = contributedKeys.filter((key) => configuration.get(key.slice('unicodeArtJs.'.length)) === undefined);
    result.configuration.contributed = contributedKeys.length;
    result.configuration.resolved = contributedKeys.length - unresolvedKeys.length;
    assert.deepEqual(unresolvedKeys, [], 'All installed extension configuration defaults must resolve.');

    // <lang><zh-CN>只转换 untitled 临时文本，证明 VSIX 内 Core/native closure 能经真实命令和编辑器写入路径工作。</zh-CN><en>Convert only temporary untitled text to prove that the VSIX Core/native closure works through the real command and editor-write path.</en></lang>
    const sourceText = 'Installed';
    const document = await vscode.workspace.openTextDocument({ language: 'plaintext', content: sourceText });
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(0, 0, 0, sourceText.length);
    await vscode.commands.executeCommand('unicodeArtJs.generateWithDefaultTemplate');
    const convertedText = document.getText();
    assert.notEqual(convertedText, sourceText, 'Installed selection conversion must replace the selected text.');
    assert.ok(convertedText.length > 0, 'Installed selection conversion must produce non-empty text.');
    result.flows.selectionConversion = true;

    // <lang><zh-CN>这里只证明已安装包能创建 panel；DOM、消息往返和 invalid payload 仍留给 P30.7。</zh-CN><en>This proves only that the installed package can create the panel; DOM, message round trips, and invalid payloads remain for P30.7.</en></lang>
    await vscode.commands.executeCommand('unicodeArtJs.openConverter');
    result.flows.converterPanel = true;
    result.status = 'passed';
  } finally {
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
}

/**
 * @lang zh-CN
 * 按当前平台规范化路径比较值，不执行文件系统解析或宽目录遍历。
 * @lang en
 * Normalize a path comparison value for the current platform without filesystem resolution or broad traversal.
 *
 * @param {string} value 路径值 / Path value.
 * @returns {string} 比较值 / Comparison value.
 */
function normalizeForPlatform(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

module.exports = { run };
