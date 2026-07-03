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
  const menuGroups = Object.values(packageJson.contributes.menus).flat();

  for (const menu of menuGroups) {
    assert.equal(commands.has(menu.command), true, `${menu.command} is not contributed`);
  }
});
