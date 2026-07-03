const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const commandSource = fs.readFileSync(path.join(__dirname, '../../src/commands/index.ts'), 'utf8');

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
