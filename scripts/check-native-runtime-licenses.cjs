#!/usr/bin/env node

/**
 * @lang zh-CN
 * 校验 Core 随包 native component map、公开 SBOM、NOTICE 与 VSIX 声明的一致性。
 *
 * 本脚本只读取仓库中的固定材料，不访问网络、不重新解析 Cargo、不加载 native module，
 * 也不把 source-resolution snapshot 误判为已发布二进制的逐位 SBOM。
 * @lang en
 * Validate alignment among Core's packaged native component map, public SBOM, NOTICE, and VSIX notice.
 *
 * This script reads only fixed repository materials. It never accesses the network, resolves Cargo
 * again, loads a native module, or mistakes the source-resolution snapshot for a bit-exact binary SBOM.
 */

const fs = require("node:fs");
const path = require("node:path");

// <lang><zh-CN>从脚本固定位置确定仓库根，阻止调用者扩大静态读取范围。</zh-CN><en>Derive the repository root from the fixed script location so callers cannot expand the static read boundary.</en></lang>
const repositoryRoot = path.resolve(__dirname, "..");
// <lang><zh-CN>聚合全部差异，让版本、许可和打包漂移能在一次运行中同时呈现。</zh-CN><en>Aggregate all differences so version, license, and packaging drift are reported in one run.</en></lang>
const errors = [];

/**
 * @lang zh-CN
 * 读取固定的 UTF-8 仓库文件。
 * @lang en
 * Read a fixed UTF-8 repository file.
 *
 * @param {string} relativePath 仓库相对路径 / Repository-relative path.
 * @returns {string} 文件正文 / File body.
 */
function readText(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

/**
 * @lang zh-CN
 * 解析固定 JSON；损坏的映射必须使 gate 失败。
 * @lang en
 * Parse fixed JSON; a malformed map must fail the gate.
 *
 * @param {string} relativePath 仓库相对路径 / Repository-relative path.
 * @returns {Record<string, any>} 已解析对象 / Parsed object.
 */
function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    errors.push(`${relativePath} 无法解析: ${String(error instanceof Error ? error.message : error)}`);
    return {};
  }
}

/**
 * @lang zh-CN
 * 严格比较审计字段。
 * @lang en
 * Strictly compare an audit field.
 *
 * @param {unknown} actual 实际值 / Actual value.
 * @param {unknown} expected 期望值 / Expected value.
 * @param {string} label 字段标签 / Field label.
 * @returns {void}
 */
function expectEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} 不匹配: ${String(actual)} !== ${String(expected)}`);
}

/**
 * @lang zh-CN
 * 要求公开材料包含固定锚点。
 * @lang en
 * Require a fixed anchor in public material.
 *
 * @param {string} content 文件正文 / File body.
 * @param {string} anchor 必需锚点 / Required anchor.
 * @param {string} label 文件标签 / File label.
 * @returns {void}
 */
function requireAnchor(content, anchor, label) {
  if (!content.includes(anchor)) errors.push(`${label} 缺少 native license 锚点: ${anchor}`);
}

/**
 * @lang zh-CN
 * 查找并校验一个精确的 component-version-license 三元组。
 * @lang en
 * Find and validate an exact component-version-license tuple.
 *
 * @param {Array<Record<string, any>>} components component map / Component map.
 * @param {string} name 组件名 / Component name.
 * @param {string} version 解析版本 / Resolved version.
 * @param {string} license SPDX 表达式 / SPDX expression.
 * @returns {void}
 */
function requireComponent(components, name, version, license) {
  const component = components.find((item) => item.name === name && item.version === version);

  if (!component) {
    errors.push(`component map 缺少 ${name}@${version}`);
    return;
  }

  expectEqual(component.license, license, `${name}@${version}.license`);
  if (!Array.isArray(component.targets) || component.targets.length === 0) {
    errors.push(`${name}@${version} 缺少 target membership`);
  }
}

const componentMap = readJson("packages/core/NATIVE_COMPONENTS.json");
const corePackage = readJson("packages/core/package.json");
const rootPackage = readJson("package.json");
const coreNotice = readText("packages/core/THIRD_PARTY_NOTICES.md");
const vscodeNotice = readText("packages/vscode-extension/THIRD_PARTY_NOTICES.md");
const runtimeSbom = readText("docs/runtime-sbom.md");
const licenseAudit = readText("docs/license-audit.md");
const inspectVsix = readText("packages/vscode-extension/scripts/inspect-vsix.cjs");

// <lang><zh-CN>这些字段固定审计来源和不可越过的“非逐位 SBOM”限制。</zh-CN><en>These fields pin the audit source and the non-bit-exact-SBOM limitation.</en></lang>
expectEqual(componentMap.schema, "unicodeartjs-native-component-map@1", "componentMap.schema");
expectEqual(componentMap.runtimePackage, "@napi-rs/image", "componentMap.runtimePackage");
expectEqual(componentMap.runtimeVersion, "1.14.0", "componentMap.runtimeVersion");
expectEqual(componentMap.upstreamGitHead, "9e93ec3ee7158163f874579471882bec07cf4572", "componentMap.upstreamGitHead");
expectEqual(componentMap.resolver?.tool, "cargo", "componentMap.resolver.tool");
expectEqual(componentMap.resolver?.version, "1.97.1", "componentMap.resolver.version");
expectEqual(componentMap.resolver?.resolvedAt, "2026-08-02", "componentMap.resolver.resolvedAt");
expectEqual(componentMap.resolver?.upstreamLockfileCommitted, false, "componentMap.resolver.upstreamLockfileCommitted");
expectEqual(componentMap.resolver?.generatedLockSha256, "2eee2fcfc3f932fb76873545651457ba17213c44942ba1cf520cb97cbbcbf881", "componentMap.resolver.generatedLockSha256");
expectEqual(componentMap.scope?.limitation, "Source-resolution audit snapshot; not a bit-exact SBOM for the published native binaries.", "componentMap.scope.limitation");
expectEqual(componentMap.componentCount, 172, "componentMap.componentCount");

const components = Array.isArray(componentMap.components) ? componentMap.components : [];
expectEqual(components.length, componentMap.componentCount, "componentMap.components.length");

// <lang><zh-CN>13 个 alias 必须与 npm platform package matrix 同步，防止只保留本机目标。</zh-CN><en>The 13 aliases must stay aligned with the npm platform-package matrix so the map cannot collapse to the local target.</en></lang>
const expectedTargets = [
  "android-arm64",
  "darwin-arm64",
  "darwin-x64",
  "freebsd-x64",
  "linux-arm-gnueabihf",
  "linux-arm64-gnu",
  "linux-arm64-musl",
  "linux-x64-gnu",
  "linux-x64-musl",
  "wasm32-wasi",
  "win32-arm64-msvc",
  "win32-ia32-msvc",
  "win32-x64-msvc"
];
expectEqual(Object.keys(componentMap.targetPackageCounts ?? {}).sort().join("|"), expectedTargets.join("|"), "componentMap.targetPackageCounts keys");
expectEqual(componentMap.scope?.targetTriples?.length, 13, "componentMap.scope.targetTriples.length");

// <lang><zh-CN>逐项检查非空许可、唯一身份和目标归属；只含 copyleft 的表达式不得进入 Clean map。</zh-CN><en>Check non-empty licenses, unique identities, and target membership; copyleft-only expressions cannot enter the Clean map.</en></lang>
const identities = new Set();
const forbiddenLicensePattern = /\b(?:AGPL|GPL|LGPL|MPL|EPL|CDDL)(?:-[0-9.]|\b)/i;

for (const component of components) {
  const identity = `${component.name}@${component.version}`;
  if (identities.has(identity)) errors.push(`component map 出现重复身份: ${identity}`);
  identities.add(identity);

  if (typeof component.license !== "string" || component.license.trim() === "") {
    errors.push(`${identity} 缺少 license`);
  }
  if (forbiddenLicensePattern.test(component.license)) {
    errors.push(`${identity} 出现 Clean map 禁止的 copyleft 表达式: ${component.license}`);
  }
  if (!Array.isArray(component.targets) || component.targets.length === 0) {
    errors.push(`${identity} 缺少 target membership`);
  }
}

// <lang><zh-CN>重点三元组覆盖 binding、稳定格式 codec、扩展能力和 notice-sensitive 传递项。</zh-CN><en>Key tuples cover bindings, stable-format codecs, extended capabilities, and notice-sensitive transitive entries.</en></lang>
for (const tuple of [
  ["napi_rs_image", "0.0.0", "MIT"],
  ["napi", "3.12.0", "MIT"],
  ["image", "0.25.10", "MIT OR Apache-2.0"],
  ["fast_image_resize", "6.1.0", "MIT OR Apache-2.0"],
  ["libwebp-sys", "0.14.4", "MIT"],
  ["lodepng", "3.12.2", "Zlib"],
  ["mozjpeg-sys", "2.2.3", "IJG AND Zlib AND BSD-3-Clause"],
  ["libavif-sys", "0.17.0+libavif.1.0.4", "BSD-2-Clause"],
  ["libaom-sys", "0.17.2+libaom.3.11.0", "BSD-2-Clause"],
  ["resvg", "0.47.0", "Apache-2.0 OR MIT"],
  ["tiny-skia", "0.12.0", "BSD-3-Clause"],
  ["unicode-ident", "1.0.24", "(MIT OR Apache-2.0) AND Unicode-3.0"],
  ["windows", "0.62.2", "MIT OR Apache-2.0"],
  ["objc2-image-io", "0.3.2", "Zlib OR Apache-2.0 OR MIT"]
]) {
  requireComponent(components, ...tuple);
}

expectEqual(corePackage.dependencies?.["@napi-rs/image"], componentMap.runtimeVersion, "core @napi-rs/image version");
expectEqual(corePackage.files?.includes("NATIVE_COMPONENTS.json"), true, "core package includes NATIVE_COMPONENTS.json");
requireAnchor(rootPackage.scripts?.["release:gate"] ?? "", "native-components:check", "package.json release:gate");
requireAnchor(inspectVsix, "extension/node_modules/unicode-art-js/NATIVE_COMPONENTS.json", "VSIX inspect script");

for (const [label, content] of [
  ["Core NOTICE", coreNotice],
  ["VSIX NOTICE", vscodeNotice],
  ["runtime SBOM", runtimeSbom],
  ["license audit", licenseAudit]
]) {
  for (const anchor of ["NATIVE_COMPONENTS.json", "172", "13", "mozjpeg", "Unicode-3.0"]) {
    requireAnchor(content, anchor, label);
  }
}

for (const anchor of ["not a bit-exact SBOM", "upstreamLockfileCommitted", "source-resolution"]) {
  requireAnchor(JSON.stringify(componentMap) + runtimeSbom, anchor, "component map/runtime SBOM limitation");
}

if (errors.length > 0) {
  process.stderr.write(`Native runtime license checks failed:\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(`Native runtime license checks passed (${components.length} components / ${expectedTargets.length} targets).\n`);
