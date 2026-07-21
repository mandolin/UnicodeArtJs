/**
 * ============================================================================
 * 🟦 Web Studio Alpha 资源入口提案
 * ============================================================================
 *
 * 🔶 模块职责
 * 将 Web 现有 Resource Discovery 的已验证资源状态，转换为 Studio Alpha
 * 可展示的资源条目与导入提案。这里不读取网络、不写工作区、不执行资源，
 * 只生成 review-only 的事实对象。
 *
 * 🔶 安全边界
 * - 只消费调用方已经完成 hash / trust / revocation 校验的资源状态。
 * - import proposal 默认不确认，必须由宿主 UI 二次确认。
 * - Web Alpha 首轮只把资源导入当前 source-first editor，不写稳定项目格式。
 *
 * @module @unicode-art/web/studio/resource-entry
 * @license MIT
 * ============================================================================
 */

//#region 🟩 格式常量

/** Studio 资源入口 UI 原型的内部 schema。 */
export const STUDIO_RESOURCE_ENTRY_SCHEMA = 'unicodeartjs-studio-resource-entry';

/** Studio 资源导入提案 UI 原型的内部 schema。 */
export const STUDIO_IMPORT_PROPOSAL_SCHEMA = 'unicodeartjs-studio-import-proposal';

/** P18.5 首轮实现仍是内部实验能力。 */
export const STUDIO_RESOURCE_ENTRY_STABILITY = 'internal-experimental';

export const STUDIO_REQUIRED_CONFIRMATION_FIELDS = Object.freeze([
  'title',
  'resourceId',
  'resourceKind',
  'license',
  'provenance',
  'source',
  'size',
  'sha256',
  'trustStatus',
  'revocationStatus',
  'cacheTarget',
  'targetAction',
  'targetScope',
  'effectSummary',
]);

const resourceKindMap = Object.freeze({
  'unicode-art-font': 'uaf',
  'semantic-document': 'uadoc',
});

//#endregion

//#region 🟩 基础工具

function toTitleText(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const zh = typeof value['zh-CN'] === 'string' ? value['zh-CN'].trim() : '';
    const en = typeof value.en === 'string' ? value.en.trim() : '';
    if (zh) return zh;
    if (en) return en;
  }
  return fallback;
}

function mapResourceKind(kind) {
  return resourceKindMap[kind] || String(kind || 'unknown');
}

function mapTargetAction(resourceKind) {
  if (resourceKind === 'uadoc') return 'import-document';
  return 'attach-resource';
}

function buildEffectSummary(entry) {
  if (entry.resourceKind === 'uadoc') {
    return `Import semantic document resource ${entry.id} into the current editor workspace.`;
  }
  if (entry.resourceKind === 'uaf') {
    return `Import Unicode art font resource ${entry.id} into the current editor workspace.`;
  }
  return `Inspect resource ${entry.id} without automatic install or execution.`;
}

function normalizeTrustCheck(entry) {
  return Object.freeze({
    hash: entry.verification?.ok ? 'pass' : 'fail',
    maintainerSignature: entry.trustChain.status === 'maintainer-signed' ? 'pass' : 'fail',
    revocation: entry.trustChain.revoked ? 'fail' : 'pass',
    coreValidation: entry.verification?.shapeOk ? 'pass' : 'fail',
    licenseReview: entry.license.expression ? 'pass' : 'needs-review',
  });
}

//#endregion

//#region 🟩 公开 API

/**
 * 从 Resource Discovery 的单项状态创建 Studio 资源条目。
 *
 * @param {Object} state 已验证的资源状态。
 * @param {Object} [options] 标题与 locale 等展示选项。
 * @returns {Object} review-only 的 Studio resource entry。
 */
export function createStudioResourceEntryFromDiscoveryState(state, options = {}) {
  const resource = state?.resource || {};
  const artwork = state?.artwork || null;
  const title = options.title || toTitleText(artwork?.title, resource.id || 'resource');
  const resourceKind = mapResourceKind(resource.kind);

  return Object.freeze({
    schema: STUDIO_RESOURCE_ENTRY_SCHEMA,
    stage: 'W-art-P18.5',
    stability: STUDIO_RESOURCE_ENTRY_STABILITY,
    id: resource.id,
    kind: 'official-resource',
    resourceKind,
    title,
    source: Object.freeze({
      type: 'same-origin-gallery',
      uri: resource.source ? `gallery/${resource.source}` : '',
    }),
    size: resource.size ?? null,
    sha256: resource.sha256 || '',
    license: Object.freeze({
      expression: resource.license?.expression || '',
      noticeRequired: true,
    }),
    provenance: Object.freeze({
      origin: artwork?.license?.origin || resource.license?.origin || 'original',
      summary: 'Reviewed same-origin gallery resource.',
    }),
    trustChain: Object.freeze({
      status: state?.trustStatus || 'unknown',
      revoked: Boolean(state?.revocation?.revoked),
    }),
    review: Object.freeze({
      status: state?.ok ? 'maintainer-reviewed' : 'needs-user-review',
      reviewedAt: resource.reviewedAt || '',
      notes: Object.freeze(['same-origin-gallery', 'no-auto-install', 'no-execution']),
    }),
    compatibility: Object.freeze({
      uadm: resourceKind === 'uadoc' ? 'compatible' : 'requires-conversion',
      host: 'web',
    }),
    verification: Object.freeze({
      ok: Boolean(state?.ok),
      sizeOk: Boolean(state?.verification?.sizeOk),
      sha256Ok: Boolean(state?.verification?.sha256Ok),
      shapeOk: Boolean(state?.verification?.shapeOk),
      actualSha256: state?.verification?.actualSha256 || '',
    }),
    importAllowed: Boolean(state?.importAllowed && state?.ok && !state?.revocation?.revoked),
    importBlockReason: state?.error || '',
  });
}

/**
 * 根据资源条目创建导入提案。
 *
 * @param {Object} entry Studio resource entry。
 * @returns {Object} review-only 的导入提案。
 */
export function createStudioImportProposalFromResourceEntry(entry) {
  const targetAction = mapTargetAction(entry.resourceKind);
  const trustCheck = normalizeTrustCheck(entry);
  const importAllowed = Boolean(
    entry.importAllowed
    && trustCheck.hash === 'pass'
    && trustCheck.maintainerSignature === 'pass'
    && trustCheck.revocation === 'pass'
    && trustCheck.coreValidation === 'pass',
  );

  return Object.freeze({
    schema: STUDIO_IMPORT_PROPOSAL_SCHEMA,
    stage: 'W-art-P18.5',
    stability: STUDIO_RESOURCE_ENTRY_STABILITY,
    id: `proposal-${entry.id}`,
    resourceEntryId: entry.id,
    status: importAllowed ? 'confirmation-pending' : 'blocked',
    targetAction,
    targetScope: 'editor-session-preview',
    effectSummary: buildEffectSummary(entry),
    requiredConfirmationFields: STUDIO_REQUIRED_CONFIRMATION_FIELDS,
    writesTo: Object.freeze([
      'editor-workspace.currentSource',
      'editor-session.importPreview',
    ]),
    trustCheck,
    humanConfirmationRequired: true,
    confirmedByDefault: false,
  });
}

/**
 * 生成适合 textarea/pre 展示的提案摘要。
 *
 * @param {Object} entry Studio resource entry。
 * @param {Object} proposal Studio import proposal。
 * @returns {string} 多行摘要文本。
 */
export function formatStudioImportProposalSummary(entry, proposal) {
  const lines = [
    `resourceId: ${entry.id}`,
    `title: ${entry.title}`,
    `resourceKind: ${entry.resourceKind}`,
    `source: ${entry.source.uri}`,
    `license: ${entry.license.expression}`,
    `size: ${entry.size ?? '--'}`,
    `sha256: ${entry.sha256}`,
    `trustStatus: ${entry.trustChain.status}`,
    `revocationStatus: ${entry.trustChain.revoked ? 'revoked-resource' : 'not-revoked'}`,
    `targetAction: ${proposal.targetAction}`,
    `targetScope: ${proposal.targetScope}`,
    `effectSummary: ${proposal.effectSummary}`,
    `writesTo: ${proposal.writesTo.join(', ')}`,
    `humanConfirmationRequired: ${proposal.humanConfirmationRequired}`,
    `confirmedByDefault: ${proposal.confirmedByDefault}`,
  ];

  return lines.join('\n');
}

//#endregion
