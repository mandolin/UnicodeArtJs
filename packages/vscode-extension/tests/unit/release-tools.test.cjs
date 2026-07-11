const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const scriptPath = path.join(repoRoot, 'packages', 'vscode-extension', 'scripts', 'core-dependency.cjs');
const sourcePackagePath = path.join(repoRoot, 'packages', 'vscode-extension', 'package.json');

test('VSCode release dependency helper switches local and npm Core specs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-vscode-release-'));

  try {
    const packagePath = path.join(tempDir, 'package.json');
    const corePackagePath = path.join(tempDir, 'core-package.json');
    fs.copyFileSync(sourcePackagePath, packagePath);
    fs.writeFileSync(corePackagePath, JSON.stringify({ version: '1.2.3' }), 'utf8');
    const initialSpec = JSON.parse(fs.readFileSync(sourcePackagePath, 'utf8')).dependencies['unicode-art-js'];

    const env = {
      ...process.env,
      UNICODE_ART_VSCODE_PACKAGE_JSON: packagePath,
      UNICODE_ART_CORE_PACKAGE_JSON: corePackagePath
    };

    assert.equal(runScript('status', env), initialSpec);
    assert.equal(runScript('use-local', env), 'file:../core');
    assert.throws(() => runScript('verify-release', env), /Release dependency must use npm/);
    assert.equal(runScript('use-npm', env), '^1.2.3');
    assert.equal(runScript('verify-release', env), '^1.2.3');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

function runScript(command, env) {
  return execFileSync(process.execPath, [scriptPath, command], {
    cwd: repoRoot,
    env,
    encoding: 'utf8'
  }).trim();
}
