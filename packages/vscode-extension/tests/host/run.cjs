/**
 * @lang zh-CN
 * 在真实 VS Code Extension Host 中验证激活、命令、配置、编辑器写入与 Converter WebView 创建。
 *
 * 结果只包含公共版本、计数、布尔值和枚举，不记录临时路径、文档正文、日志正文或用户状态。
 * @lang en
 * Validate activation, commands, configuration, editor writes, and Converter WebView creation in
 * a real VS Code Extension Host.
 *
 * Results contain only public versions, counts, booleans, and enums; they never record temporary
 * paths, document bodies, log bodies, or user state.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
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
 * 执行隔离 Extension Host smoke，并写出 portable result。
 * @lang en
 * Run the isolated Extension Host smoke and write its portable result.
 *
 * @returns {Promise<void>}
 */
async function run() {
  const resultPath = process.env.UNICODE_ART_HOST_RESULT_PATH;
  if (!resultPath) throw new Error('UNICODE_ART_HOST_RESULT_PATH is required.');

  const result = {
    schema: 'unicodeartjs-vscode-extension-host-smoke@0',
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
      active: false
    },
    commands: {
      expected: EXPECTED_COMMANDS.length,
      visible: 0,
      missing: EXPECTED_COMMANDS.length
    },
    configuration: {
      contributed: 0,
      resolved: 0
    },
    flows: {
      selectionConversion: false,
      converterPanel: false
    },
    boundaries: {
      isolatedUserData: true,
      isolatedExtensionsDirectory: true,
      temporaryWorkspace: true,
      vsixInstalled: false,
      networkRequestedByHarness: false,
      userFileReadByHarness: false
    }
  };

  try {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `Extension not found: ${EXTENSION_ID}`);
    result.extension.version = extension.packageJSON.version;

    await extension.activate();
    result.extension.active = extension.isActive;
    assert.equal(extension.isActive, true, 'Extension must be active after activation.');

    // <lang><zh-CN>命令可见性来自真实 host registry，而不是重复解析 manifest。</zh-CN><en>Command visibility comes from the real host registry, not from reparsing the manifest.</en></lang>
    const visibleCommands = new Set(await vscode.commands.getCommands(true));
    const missingCommands = EXPECTED_COMMANDS.filter((command) => !visibleCommands.has(command));
    result.commands.visible = EXPECTED_COMMANDS.length - missingCommands.length;
    result.commands.missing = missingCommands.length;
    assert.deepEqual(missingCommands, [], 'All contributed commands must be registered in the host.');

    // <lang><zh-CN>配置值通过真实 VS Code configuration service 解析，null 默认值仍视为已解析。</zh-CN><en>Resolve values through the real VS Code configuration service; a null default still counts as resolved.</en></lang>
    const contributedProperties = extension.packageJSON.contributes.configuration.properties;
    const contributedKeys = Object.keys(contributedProperties);
    const configuration = vscode.workspace.getConfiguration('unicodeArtJs');
    const unresolvedKeys = contributedKeys.filter((key) => configuration.get(key.slice('unicodeArtJs.'.length)) === undefined);
    result.configuration.contributed = contributedKeys.length;
    result.configuration.resolved = contributedKeys.length - unresolvedKeys.length;
    assert.deepEqual(unresolvedKeys, [], 'All contributed configuration defaults must resolve in the host.');

    // <lang><zh-CN>只操作 untitled 临时文档；转换必须经真实命令、Core adapter 与 TextEditor.edit 边界完成。</zh-CN><en>Operate only on an untitled temporary document; conversion must traverse the real command, Core adapter, and TextEditor.edit boundary.</en></lang>
    const sourceText = 'Host';
    const document = await vscode.workspace.openTextDocument({ language: 'plaintext', content: sourceText });
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(0, 0, 0, sourceText.length);
    await vscode.commands.executeCommand('unicodeArtJs.generateWithDefaultTemplate');
    const convertedText = document.getText();
    assert.notEqual(convertedText, sourceText, 'Selection conversion must replace the selected text.');
    assert.ok(convertedText.length > 0, 'Selection conversion must produce non-empty text.');
    result.flows.selectionConversion = true;

    // <lang><zh-CN>Converter 命令只验证 WebView panel 能在宿主中创建；本阶段不伪造 DOM 或消息往返覆盖。</zh-CN><en>The Converter command verifies only that a WebView panel can be created in the host; this stage does not fake DOM or message round-trip coverage.</en></lang>
    await vscode.commands.executeCommand('unicodeArtJs.openConverter');
    result.flows.converterPanel = true;
    result.status = 'passed';
  } finally {
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
}

module.exports = { run };
