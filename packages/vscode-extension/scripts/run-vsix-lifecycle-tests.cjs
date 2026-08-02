#!/usr/bin/env node
/**
 * @lang zh-CN
 * 在隔离的 VS Code profile 中验证本地 VSIX 的安装、版本替换、真实宿主激活和卸载生命周期。
 *
 * 当前 VSIX 必须来自本仓库的显式文件；可选的较低版本 VSIX 只建立真实版本迁移状态，绝不在
 * Extension Host 中激活。所有可写状态均位于本轮系统 Temp stage，不触及维护者 profile。
 * @lang en
 * Validate local VSIX installation, version replacement, real-host activation, and uninstallation
 * inside an isolated VS Code profile.
 *
 * The current VSIX must be an explicit repository file. An optional lower-version VSIX establishes
 * a real version transition but is never activated in the Extension Host. Every writable state lives
 * in this run's system Temp stage and never touches the maintainer profile.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXTENSION_ID = 'mandolin.unicode-art-js-vscode';
const extensionRoot = path.resolve(__dirname, '..');
const extensionPackage = readJson(path.join(extensionRoot, 'package.json'));
const currentVsixPath = path.resolve(
  process.env.UNICODE_ART_CURRENT_VSIX
    || path.join(extensionRoot, `${extensionPackage.name}-${extensionPackage.version}.vsix`)
);
const previousVsixPath = parsePreviousVsix(process.argv.slice(2));
const testRunnerPath = path.join(extensionRoot, 'tests', 'vsix-host', 'run.cjs');
const tempRoot = path.resolve(os.tmpdir());
const stageRoot = fs.mkdtempSync(path.join(tempRoot, 'unicode-art-vsix-lifecycle-'));
const userDataDir = path.join(stageRoot, 'user-data');
const extensionsDir = path.join(stageRoot, 'extensions');
const workspaceDir = path.join(stageRoot, 'workspace');
const resultPath = path.join(stageRoot, 'installed-host-result.json');

try {
  assertRegularVsix(currentVsixPath, 'current');
  if (previousVsixPath) assertRegularVsix(previousVsixPath, 'previous');

  // <lang><zh-CN>CLI 与宿主共用同一个本轮 stage，使安装状态与宿主读取状态可追溯且不外溢。</zh-CN><en>The CLI and host share this run's stage so installed state is traceable and cannot escape the isolation boundary.</en></lang>
  for (const directory of [userDataDir, extensionsDir, workspaceDir]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(path.join(workspaceDir, 'lifecycle-smoke.txt'), 'UnicodeArtJs VSIX lifecycle smoke\n', 'utf8');

  const vscode = resolveVsCodeInstallation();
  const currentSha256 = sha256(currentVsixPath);
  let previousVersion = null;
  let previousSha256 = null;

  if (previousVsixPath) {
    previousSha256 = sha256(previousVsixPath);
    runCli(vscode, ['--install-extension', previousVsixPath, '--force']);
    previousVersion = readListedVersion(vscode);
    if (!previousVersion) throw new Error('The previous VSIX was not listed after isolated installation.');
    if (compareVersions(previousVersion, extensionPackage.version) >= 0) {
      throw new Error(`Previous VSIX version ${previousVersion} must be lower than ${extensionPackage.version}.`);
    }
  }

  runCli(vscode, ['--install-extension', currentVsixPath, '--force']);
  const installedVersion = readListedVersion(vscode);
  if (installedVersion !== extensionPackage.version) {
    throw new Error(`Expected installed version ${extensionPackage.version}, received ${String(installedVersion)}.`);
  }

  // <lang><zh-CN>再次强制安装同一产物，验证维护者本地修复场景中的确定性替换路径；它与跨版本升级分开记录。</zh-CN><en>Force-install the same artifact again to verify the deterministic local repair path; record it separately from a cross-version upgrade.</en></lang>
  runCli(vscode, ['--install-extension', currentVsixPath, '--force']);
  if (readListedVersion(vscode) !== extensionPackage.version) {
    throw new Error('Forced same-version replacement did not preserve the current installed version.');
  }

  const installedExtensionRoot = resolveInstalledExtensionRoot();
  const hostResult = runInstalledHost(vscode, installedExtensionRoot);

  runCli(vscode, ['--uninstall-extension', EXTENSION_ID]);
  const versionAfterUninstall = readListedVersion(vscode);
  if (versionAfterUninstall !== null) {
    throw new Error(`Extension remained listed after uninstall: ${versionAfterUninstall}.`);
  }

  const portableResult = {
    schema: 'unicodeartjs-vscode-vsix-lifecycle@0',
    status: 'passed',
    artifact: {
      currentVersion: extensionPackage.version,
      currentSha256,
      previousVersion,
      previousSha256
    },
    lifecycle: {
      cleanInstall: previousVsixPath === null,
      previousVersionInstalled: previousVsixPath !== null,
      versionUpgrade: previousVsixPath !== null,
      forcedSameVersionReplacement: true,
      installedHostSmoke: true,
      uninstall: true,
      listedAfterUninstall: false
    },
    hostResult,
    boundaries: {
      isolatedUserData: true,
      isolatedExtensionsDirectory: true,
      temporaryWorkspace: true,
      previousArtifactActivated: false,
      localVsixOnly: true,
      networkRequestedByHarness: false,
      maintainerProfileReadByHarness: false,
      maintainerProfileWrittenByHarness: false
    }
  };

  assertPortableResult(portableResult);
  process.stdout.write(`${JSON.stringify(portableResult, null, 2)}\n`);
} finally {
  // <lang><zh-CN>递归删除前重新验证 stage 是系统 Temp 的直属子目录，拒绝宽路径、仓库路径和环境变量展开结果。</zh-CN><en>Before recursive deletion, revalidate that the stage is a direct child of system Temp, rejecting broad paths, repository paths, and expanded environment-variable targets.</en></lang>
  const normalizedTemp = tempRoot.endsWith(path.sep) ? tempRoot : `${tempRoot}${path.sep}`;
  if (!stageRoot.startsWith(normalizedTemp) || path.dirname(stageRoot) !== tempRoot) {
    throw new Error(`Refusing to clean a VSIX lifecycle stage outside Temp: ${stageRoot}`);
  }
  fs.rmSync(stageRoot, { recursive: true, force: true });
}

/**
 * @lang zh-CN
 * 读取可选的 `--previous-vsix` 参数；其它位置参数一律拒绝，避免误把未知文件当成升级输入。
 * @lang en
 * Read the optional `--previous-vsix` argument and reject every other positional input so an
 * unknown file cannot silently become upgrade evidence.
 *
 * @param {string[]} args CLI 参数 / CLI arguments.
 * @returns {string | null} 较低版本 VSIX 绝对路径或 null / Lower-version VSIX absolute path or null.
 */
function parsePreviousVsix(args) {
  if (args.length === 0) return null;
  if (args.length !== 2 || args[0] !== '--previous-vsix') {
    throw new Error('Usage: run-vsix-lifecycle-tests.cjs [--previous-vsix <absolute-or-relative-vsix-path>]');
  }
  return path.resolve(args[1]);
}

/**
 * @lang zh-CN
 * 确认生命周期输入是已存在的普通 `.vsix` 文件。
 * @lang en
 * Confirm that a lifecycle input is an existing regular `.vsix` file.
 *
 * @param {string} filePath 输入路径 / Input path.
 * @param {string} label 诊断标签 / Diagnostic label.
 * @returns {void}
 */
function assertRegularVsix(filePath, label) {
  if (path.extname(filePath).toLowerCase() !== '.vsix' || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`The ${label} VSIX is not an existing regular .vsix file.`);
  }
}

/**
 * @lang zh-CN
 * 解析当前 VS Code GUI 可执行文件和同一安装中的 Node CLI 入口。
 * @lang en
 * Resolve the current VS Code GUI executable and the Node CLI entry from the same installation.
 *
 * @returns {{ executable: string, cliJs: string }} 宿主安装入口 / Host installation entry points.
 */
function resolveVsCodeInstallation() {
  const explicitExecutable = process.env.UNICODE_ART_VSCODE_EXECUTABLE;
  const executableCandidates = [
    explicitExecutable,
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe')
  ].filter(Boolean);
  const executable = executableCandidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!executable) throw new Error('VS Code executable not found; set UNICODE_ART_VSCODE_EXECUTABLE.');

  const installationRoot = path.dirname(path.resolve(executable));
  const explicitCliJs = process.env.UNICODE_ART_VSCODE_CLI_JS;
  const cliCandidates = [
    explicitCliJs,
    path.join(installationRoot, 'resources', 'app', 'out', 'cli.js'),
    ...fs.readdirSync(installationRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(installationRoot, entry.name, 'resources', 'app', 'out', 'cli.js'))
  ].filter(Boolean);
  const cliJs = cliCandidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!cliJs) throw new Error('VS Code CLI entry not found; set UNICODE_ART_VSCODE_CLI_JS.');
  return { executable: path.resolve(executable), cliJs: path.resolve(cliJs) };
}

/**
 * @lang zh-CN
 * 通过 VS Code 自带 Node CLI 在隔离目录执行扩展管理命令。
 * @lang en
 * Run an extension-management command through VS Code's bundled Node CLI and isolated directories.
 *
 * @param {{ executable: string, cliJs: string }} vscode VS Code 入口 / VS Code entry points.
 * @param {string[]} args 扩展管理参数 / Extension-management arguments.
 * @returns {string} CLI stdout.
 */
function runCli(vscode, args) {
  const completed = spawnSync(vscode.executable, [
    vscode.cliJs,
    '--user-data-dir', userDataDir,
    '--extensions-dir', extensionsDir,
    ...args
  ], {
    cwd: stageRoot,
    encoding: 'utf8',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', VSCODE_DEV: '' },
    timeout: 120_000,
    windowsHide: true
  });
  if (completed.error) throw completed.error;
  if (completed.status !== 0) {
    throw new Error(`VS Code CLI failed with status ${String(completed.status)}; captured stdout=${completed.stdout?.length ?? 0}, stderr=${completed.stderr?.length ?? 0}.`);
  }
  return completed.stdout || '';
}

/**
 * @lang zh-CN
 * 从隔离 profile 的 `--show-versions` 输出读取目标扩展版本。
 * @lang en
 * Read the target extension version from isolated-profile `--show-versions` output.
 *
 * @param {{ executable: string, cliJs: string }} vscode VS Code 入口 / VS Code entry points.
 * @returns {string | null} 已安装版本或 null / Installed version or null.
 */
function readListedVersion(vscode) {
  const output = runCli(vscode, ['--list-extensions', '--show-versions']);
  const prefix = `${EXTENSION_ID}@`.toLowerCase();
  const line = output.split(/\r?\n/).map((value) => value.trim()).find((value) => value.toLowerCase().startsWith(prefix));
  return line ? line.slice(prefix.length) : null;
}

/**
 * @lang zh-CN
 * 定位由 VS Code CLI 解包的当前扩展，并确认其版本和目录边界。
 * @lang en
 * Locate the current extension unpacked by the VS Code CLI and verify its version and directory boundary.
 *
 * @returns {string} 已安装扩展根目录 / Installed extension root.
 */
function resolveInstalledExtensionRoot() {
  const candidates = fs.readdirSync(extensionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().startsWith(`${EXTENSION_ID}-`))
    .map((entry) => path.join(extensionsDir, entry.name))
    .filter((candidate) => {
      const manifestPath = path.join(candidate, 'package.json');
      return fs.existsSync(manifestPath) && readJson(manifestPath).version === extensionPackage.version;
    });
  if (candidates.length !== 1) {
    throw new Error(`Expected one installed current extension directory, received ${candidates.length}.`);
  }
  return candidates[0];
}

/**
 * @lang zh-CN
 * 从 CLI 实际解包目录启动真实 Extension Host；测试模式用 development-path 指向该安装产物。
 * @lang en
 * Launch a real Extension Host from the directory unpacked by the CLI; test mode points its
 * development path at that installed artifact.
 *
 * @param {{ executable: string, cliJs: string }} vscode VS Code 入口 / VS Code entry points.
 * @param {string} installedExtensionRoot 已安装产品扩展根目录 / Installed product extension root.
 * @returns {object} 已校验的 portable host result / Validated portable host result.
 */
function runInstalledHost(vscode, installedExtensionRoot) {
  const args = [
    workspaceDir,
    `--extensionDevelopmentPath=${installedExtensionRoot}`,
    `--extensionTestsPath=${testRunnerPath}`,
    `--user-data-dir=${userDataDir}`,
    `--extensions-dir=${extensionsDir}`,
    '--disable-gpu',
    '--disable-telemetry',
    '--disable-updates',
    '--skip-welcome',
    '--skip-release-notes',
    '--new-window'
  ];
  const hostEnvironment = {
    ...process.env,
    UNICODE_ART_HOST_RESULT_PATH: resultPath,
    UNICODE_ART_INSTALLED_EXTENSION_ROOT: installedExtensionRoot,
    VSCODE_DISABLE_CRASH_REPORTER: '1'
  };
  delete hostEnvironment.ELECTRON_RUN_AS_NODE;

  const completed = spawnSync(vscode.executable, args, {
    cwd: workspaceDir,
    encoding: 'utf8',
    env: hostEnvironment,
    timeout: 180_000,
    windowsHide: true
  });
  if (completed.error) throw completed.error;
  if (completed.status !== 0) {
    // <lang><zh-CN>runner 写出的失败结果仍只含 portable 字段；输出它可定位断言，同时继续隐藏 VS Code 原始路径日志。</zh-CN><en>The runner's failed result still contains only portable fields; emit it to identify the assertion while keeping raw VS Code path logs hidden.</en></lang>
    if (fs.existsSync(resultPath)) process.stderr.write(fs.readFileSync(resultPath, 'utf8'));
    // <lang><zh-CN>显式诊断开关只供隔离 stage 调试，不进入正式 evidence 或默认成功输出。</zh-CN><en>The explicit diagnostic switch is only for isolated-stage debugging and never enters formal evidence or default success output.</en></lang>
    if (process.env.UNICODE_ART_DEBUG_HOST === '1') {
      process.stderr.write(`--- isolated VS Code stdout ---\n${completed.stdout || ''}\n`);
      process.stderr.write(`--- isolated VS Code stderr ---\n${completed.stderr || ''}\n`);
    }
    throw new Error(`Installed Extension Host failed with status ${String(completed.status)}; captured stdout=${completed.stdout?.length ?? 0}, stderr=${completed.stderr?.length ?? 0}.`);
  }
  if (!fs.existsSync(resultPath)) throw new Error('Installed Extension Host did not produce a portable result.');
  const result = readJson(resultPath);
  if (result.schema !== 'unicodeartjs-vscode-vsix-installed-host@0' || result.status !== 'passed') {
    throw new Error('Installed Extension Host returned an unexpected or failed result.');
  }
  return result;
}

/**
 * @lang zh-CN
 * 比较本阶段使用的三段数字 semver；预发布或其它形态会 fail closed。
 * @lang en
 * Compare the three-number semver values used by this stage and fail closed on prerelease or other forms.
 *
 * @param {string} left 左版本 / Left version.
 * @param {string} right 右版本 / Right version.
 * @returns {number} 负数、零或正数 / Negative, zero, or positive value.
 */
function compareVersions(left, right) {
  const pattern = /^(\d+)\.(\d+)\.(\d+)$/;
  const leftMatch = pattern.exec(left);
  const rightMatch = pattern.exec(right);
  if (!leftMatch || !rightMatch) throw new Error('Lifecycle version comparison requires three-number semver values.');
  const leftParts = leftMatch.slice(1).map(Number);
  const rightParts = rightMatch.slice(1).map(Number);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

/**
 * @lang zh-CN
 * 计算本地生命周期输入的 SHA-256，不输出文件路径。
 * @lang en
 * Calculate SHA-256 for a local lifecycle input without emitting its path.
 *
 * @param {string} filePath 文件路径 / File path.
 * @returns {string} 小写 SHA-256 / Lowercase SHA-256.
 */
function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * @lang zh-CN
 * 读取 UTF-8 JSON 文件。
 * @lang en
 * Read a UTF-8 JSON file.
 *
 * @param {string} filePath 文件路径 / File path.
 * @returns {any} JSON 值 / JSON value.
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @lang zh-CN
 * 对生命周期结果执行 fail-closed 最小断言，防止部分成功被写成阶段通过。
 * @lang en
 * Fail closed on the lifecycle result so partial success cannot be reported as a stage pass.
 *
 * @param {any} result 生命周期结果 / Lifecycle result.
 * @returns {void}
 */
function assertPortableResult(result) {
  if (result.schema !== 'unicodeartjs-vscode-vsix-lifecycle@0' || result.status !== 'passed') {
    throw new Error('Unexpected VSIX lifecycle result schema or status.');
  }
  if (!result.lifecycle.forcedSameVersionReplacement || !result.lifecycle.installedHostSmoke || !result.lifecycle.uninstall) {
    throw new Error('VSIX lifecycle evidence is incomplete.');
  }
  if (result.hostResult.extension?.version !== extensionPackage.version || result.hostResult.extension?.active !== true) {
    throw new Error('Installed host did not activate the current extension version.');
  }
  if (previousVsixPath && (!result.lifecycle.versionUpgrade || !result.artifact.previousVersion)) {
    throw new Error('A supplied previous VSIX must produce version-upgrade evidence.');
  }
}
