/**
 * @lang zh-CN 校验 VS Code 扩展清单的命令注册、菜单、配置、本地化和 Restricted Mode 契约保持一致。
 * @lang en Validate that the VS Code extension manifest keeps commands, menus, configuration, localization, and Restricted Mode contracts aligned.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const packageNls = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.nls.json'), 'utf8'));
const packageNlsZhCn = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.nls.zh-cn.json'), 'utf8'));
const commandSource = fs.readFileSync(path.join(__dirname, '../../src/commands/index.ts'), 'utf8');
const configResolverSource = fs.readFileSync(path.join(__dirname, '../../src/config/configResolver.ts'), 'utf8');

test('all contributed commands have activation events', () => {
  const commands = packageJson.contributes.commands.map((item) => item.command);
  const activationEvents = new Set(packageJson.activationEvents);

  for (const command of commands) {
    assert.equal(activationEvents.has(`onCommand:${command}`), true, `${command} is missing activation event`);
  }
});

test('all contributed commands are registered in commands/index.ts', () => {
  const commands = packageJson.contributes.commands.map((item) => item.command);

  for (const command of commands) {
    assert.equal(commandSource.includes(`registerCommand('${command}'`), true, `${command} is not registered`);
  }
});

test('context menus reference contributed commands only', () => {
  const commands = new Set(packageJson.contributes.commands.map((item) => item.command));
  const submenus = new Set((packageJson.contributes.submenus ?? []).map((item) => item.id));
  const menuGroups = Object.values(packageJson.contributes.menus).flat();

  for (const menu of menuGroups) {
    if (menu.command) {
      assert.equal(commands.has(menu.command), true, `${menu.command} is not contributed`);
      continue;
    }

    assert.equal(submenus.has(menu.submenu), true, `${menu.submenu} is not contributed`);
  }
});

test('editor context exposes the UnicodeArtJs template menu group', () => {
  const editorMenu = packageJson.contributes.menus['editor/context'];
  const customTemplatesMenu = packageJson.contributes.menus['unicodeArtJs.customTemplates'];

  assert.equal(
    editorMenu.some((item) => item.command === 'unicodeArtJs.generateWithDefaultTemplate'),
    true,
    'default template command is missing from editor context'
  );
  assert.equal(
    editorMenu.some((item) => item.submenu === 'unicodeArtJs.customTemplates'),
    true,
    'custom template submenu is missing from editor context'
  );
  assert.equal(
    editorMenu.some((item) => item.command === 'unicodeArtJs.openConverter'),
    true,
    'open converter command is missing from editor context'
  );
  assert.equal(customTemplatesMenu.length >= 3, true, 'custom template submenu should expose template slots');
});

test('manifest localization keys are present in default and zh-CN nls files', () => {
  const keys = collectNlsKeys(packageJson);

  assert.equal(keys.size > 0, true, 'manifest should use nls placeholders');

  for (const key of keys) {
    assert.equal(Object.hasOwn(packageNls, key), true, `${key} is missing from package.nls.json`);
    assert.equal(Object.hasOwn(packageNlsZhCn, key), true, `${key} is missing from package.nls.zh-cn.json`);
  }
});

test('restricted workspaces expose text conversion only and restrict sensitive overrides', () => {
  // <lang><zh-CN>扩展显式声明 limited，避免 VS Code 默认策略与开发宿主行为造成能力误判。</zh-CN><en>The extension declares limited explicitly so VS Code defaults and development-host behavior cannot create capability ambiguity.</en></lang>
  const policy = packageJson.capabilities?.untrustedWorkspaces;
  const restrictedConfigurations = new Set(policy?.restrictedConfigurations ?? []);
  const explorerImageMenu = packageJson.contributes.menus['explorer/context']
    .find((item) => item.command === 'unicodeArtJs.convertImageFile');

  assert.equal(policy?.supported, 'limited');
  assert.equal(policy?.description, '%capabilities.untrustedWorkspaces%');
  for (const key of [
    'unicodeArtJs.font',
    'unicodeArtJs.visualFont',
    'unicodeArtJs.glyphFont',
    'unicodeArtJs.glyphWidthProfile',
    'unicodeArtJs.wideCharRegex',
  ]) {
    assert.equal(restrictedConfigurations.has(key), true, `${key} must be restricted`);
  }
  assert.equal(explorerImageMenu.when.includes('isWorkspaceTrusted'), true);
});

test('configuration keys are consumed by config resolver', () => {
  const properties = packageJson.contributes.configuration.properties;

  for (const key of Object.keys(properties)) {
    const settingName = key.replace(/^unicodeArtJs\./, '');
    assert.equal(
      configResolverSource.includes(`'${settingName}'`),
      true,
      `${key} is contributed but not read by configResolver.ts`
    );
  }
});

function collectNlsKeys(value, keys = new Set()) {
  if (typeof value === 'string') {
    const match = /^%(.+)%$/.exec(value);
    if (match) keys.add(match[1]);
    return keys;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNlsKeys(item, keys));
    return keys;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectNlsKeys(item, keys));
  }

  return keys;
}
