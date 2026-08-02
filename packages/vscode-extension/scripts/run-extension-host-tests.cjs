#!/usr/bin/env node
/**
 * @lang zh-CN
 * 在隔离的 VS Code 用户数据、扩展目录和临时工作区中运行 UnicodeArtJs Extension Host smoke。
 *
 * 本启动器不安装 VSIX、不读取维护者 VS Code 配置，也不下载测试宿主。它只使用显式环境变量或当前
 * Windows 已安装的 VS Code，并只输出版本、计数、布尔值和状态等可移植证据。
 * @lang en
 * Run the UnicodeArtJs Extension Host smoke with isolated VS Code user data, extension storage,
 * and a temporary workspace.
 *
 * This launcher neither installs a VSIX, reads maintainer VS Code settings, nor downloads a test
 * host. It uses only an explicit environment override or the current Windows VS Code installation
 * and emits portable version, count, boolean, and status evidence.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const extensionRoot = path.resolve(__dirname, '..');
const testRunnerPath = path.join(extensionRoot, 'tests', 'host', 'run.cjs');
const tempRoot = path.resolve(os.tmpdir());
const stageRoot = fs.mkdtempSync(path.join(tempRoot, 'unicode-art-vscode-host-'));
const userDataDir = path.join(stageRoot, 'user-data');
const extensionsDir = path.join(stageRoot, 'extensions');
const workspaceDir = path.join(stageRoot, 'workspace');
const resultPath = path.join(stageRoot, 'host-result.json');

try {
  // <lang><zh-CN>三个可写目录都位于本次 mkdtemp stage，避免复用或污染维护者的 VS Code 状态。</zh-CN><en>All three writable directories live under this mkdtemp stage, preventing reuse or mutation of maintainer VS Code state.</en></lang>
  for (const directory of [userDataDir, extensionsDir, workspaceDir]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(path.join(workspaceDir, 'host-smoke.txt'), 'UnicodeArtJs host smoke\n', 'utf8');

  const vscodeExecutable = resolveVsCodeExecutable();
  const args = [
    workspaceDir,
    `--extensionDevelopmentPath=${extensionRoot}`,
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

  // <lang><zh-CN>Codex/终端可能设置 ELECTRON_RUN_AS_NODE；真实 GUI/Extension Host 启动必须显式移除该进程级覆盖。</zh-CN><en>Codex or a terminal may set ELECTRON_RUN_AS_NODE; a real GUI/Extension Host launch must explicitly remove that process-level override.</en></lang>
  const hostEnvironment = {
    ...process.env,
    UNICODE_ART_HOST_RESULT_PATH: resultPath,
    VSCODE_DISABLE_CRASH_REPORTER: '1'
  };
  delete hostEnvironment.ELECTRON_RUN_AS_NODE;

  // <lang><zh-CN>宿主最多运行三分钟；唯一新增的继承值是位于隔离 stage 的结果文件路径。</zh-CN><en>The host may run for at most three minutes; the only added inherited value is the result path inside the isolated stage.</en></lang>
  const completed = spawnSync(vscodeExecutable, args, {
    cwd: workspaceDir,
    encoding: 'utf8',
    env: hostEnvironment,
    timeout: 180_000,
    windowsHide: true
  });

  if (completed.error) throw completed.error;
  if (completed.status !== 0) {
    // <lang><zh-CN>失败诊断只报告捕获长度；原始 Code 日志可能含临时路径，不进入 portable output。</zh-CN><en>Failure diagnostics report captured lengths only; raw Code logs may contain temporary paths and never enter portable output.</en></lang>
    process.stderr.write(`VS Code output captured: stdout=${completed.stdout?.length ?? 0}, stderr=${completed.stderr?.length ?? 0}.\n`);
    if (fs.existsSync(resultPath)) process.stderr.write(fs.readFileSync(resultPath, 'utf8'));
    throw new Error(`VS Code Extension Host exited with status ${String(completed.status)}.`);
  }
  if (!fs.existsSync(resultPath)) {
    throw new Error('VS Code Extension Host did not produce the expected portable result.');
  }

  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  assertPortableResult(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  // <lang><zh-CN>删除前重新验证 stage 严格位于系统 Temp，拒绝对宽目录或仓库路径执行递归清理。</zh-CN><en>Revalidate that the stage is strictly inside the system Temp before recursive cleanup, rejecting broad directories or repository paths.</en></lang>
  const normalizedTemp = tempRoot.endsWith(path.sep) ? tempRoot : `${tempRoot}${path.sep}`;
  if (!stageRoot.startsWith(normalizedTemp) || path.dirname(stageRoot) !== tempRoot) {
    throw new Error(`Refusing to clean an Extension Host stage outside Temp: ${stageRoot}`);
  }
  fs.rmSync(stageRoot, { recursive: true, force: true });
}

/**
 * @lang zh-CN
 * 解析明确覆盖值或当前 Windows 的 VS Code 可执行文件。
 * @lang en
 * Resolve an explicit override or the current Windows VS Code executable.
 *
 * @returns {string} VS Code 可执行文件绝对路径 / Absolute VS Code executable path.
 */
function resolveVsCodeExecutable() {
  const explicit = process.env.UNICODE_ART_VSCODE_EXECUTABLE;
  const candidates = [
    explicit,
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe')
  ].filter(Boolean);

  // <lang><zh-CN>只接受已存在的普通文件；不经 shell 解析 PATH、别名或命令字符串。</zh-CN><en>Accept only existing regular files; never resolve PATH aliases or command strings through a shell.</en></lang>
  const executable = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!executable) {
    throw new Error('VS Code executable not found; set UNICODE_ART_VSCODE_EXECUTABLE to an absolute file path.');
  }
  return path.resolve(executable);
}

/**
 * @lang zh-CN
 * 对 Extension Host 返回的最小公共证据执行 fail-closed 校验。
 * @lang en
 * Fail closed on the minimal public-safe evidence returned by the Extension Host.
 *
 * @param {unknown} value Extension Host 结果 / Extension Host result.
 * @returns {void}
 */
function assertPortableResult(value) {
  if (!value || typeof value !== 'object') throw new Error('Extension Host result must be an object.');
  if (value.schema !== 'unicodeartjs-vscode-extension-host-smoke@0') throw new Error('Unexpected Extension Host result schema.');
  if (value.status !== 'passed') throw new Error(`Extension Host smoke did not pass: ${String(value.status)}`);
  if (value.extension?.id !== 'mandolin.unicode-art-js-vscode' || value.extension?.active !== true) {
    throw new Error('UnicodeArtJs extension did not activate under the isolated Extension Host.');
  }
  if (value.commands?.expected !== 10 || value.commands?.visible !== 10 || value.commands?.missing !== 0) {
    throw new Error('Extension Host command registration evidence is incomplete.');
  }
  if (value.configuration?.contributed !== 22 || value.configuration?.resolved !== 22) {
    throw new Error('Extension Host configuration resolution evidence is incomplete.');
  }
  if (!value.host?.runtime?.node || !value.host?.runtime?.electron || !value.host?.runtime?.modules) {
    throw new Error('Extension Host runtime version evidence is incomplete.');
  }
  if (value.flows?.selectionConversion !== true || value.flows?.converterPanel !== true) {
    throw new Error('Extension Host command-flow evidence is incomplete.');
  }
}
