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

/** Studio 官方资源生产线摘要的内部 schema。 */
export const STUDIO_RESOURCE_PIPELINE_SUMMARY_SCHEMA = 'unicodeartjs-studio-resource-pipeline-summary@0';

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

function toResourceStates(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function pushUnique(list, value) {
  const text = String(value || '').trim();
  if (text && !list.includes(text)) list.push(text);
}

function countByResourceKind(states) {
  const counts = {};
  states.forEach((item) => {
    const kind = mapResourceKind(item.resource?.kind);
    counts[kind] = (counts[kind] || 0) + 1;
  });
  return Object.freeze(counts);
}

function determinePipelineState(summary) {
  if (summary.officialMaterials.total === 0) return 'empty';
  if (
    summary.officialMaterials.verified === summary.officialMaterials.total
    && summary.officialMaterials.importable > 0
    && summary.officialMaterials.revoked === 0
    && summary.trustChain.importAllowed
  ) return 'ready';
  return 'blocked';
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

/**
 * 汇总同源官方资源生产线状态。
 *
 * @param {{
 *   manifest?: Object,
 *   trustSummary?: Object,
 *   resourceStates?: Object[]
 * }} discoveryState 已加载的 Resource Discovery 状态。
 * @returns {Object} metadata-only 的官方素材生产线摘要。
 */
export function createStudioResourcePipelineSummary(discoveryState = {}) {
  const manifest = discoveryState.manifest || {};
  const states = toResourceStates(discoveryState.resourceStates);
  const licenseExpressions = [];
  const sourceTypes = [];
  let verified = 0;
  let importable = 0;
  let revoked = 0;
  let failed = 0;

  states.forEach((item) => {
    if (item.ok) verified += 1;
    else failed += 1;
    if (item.importAllowed && item.ok && !item.revocation?.revoked) importable += 1;
    if (item.revocation?.revoked) revoked += 1;
    pushUnique(licenseExpressions, item.resource?.license?.expression);
    pushUnique(sourceTypes, item.resource?.source ? 'same-origin-gallery' : '');
  });

  const trustSummary = discoveryState.trustSummary || {};
  const summary = {
    schema: STUDIO_RESOURCE_PIPELINE_SUMMARY_SCHEMA,
    stage: 'W-art-P22.6',
    stability: STUDIO_RESOURCE_ENTRY_STABILITY,
    resourcePack: Object.freeze({
      format: manifest.format || '',
      version: manifest.version ?? null,
      reviewedAt: manifest.reviewedAt || '',
      network: manifest.network || 'unknown',
      automaticInstall: Boolean(manifest.automaticInstall),
    }),
    officialMaterials: Object.freeze({
      total: states.length,
      verified,
      importable,
      blocked: Math.max(0, states.length - importable),
      failed,
      revoked,
      byKind: countByResourceKind(states),
      licenseExpressions: Object.freeze(licenseExpressions),
      sourceTypes: Object.freeze(sourceTypes),
    }),
    trustChain: Object.freeze({
      status: trustSummary.status || 'unknown',
      verified: Boolean(trustSummary.verified),
      importAllowed: Boolean(trustSummary.importAllowed),
      keyId: trustSummary.keyId || '',
      payloadSha256: trustSummary.payloadSha256 || '',
      expiresAt: trustSummary.expiresAt || '',
      revocationRecords: Number.isFinite(Number(trustSummary.revocations))
        ? Number(trustSummary.revocations)
        : 0,
    }),
    evidence: Object.freeze({
      ownerProvided: true,
      metadataOnly: true,
      includesSourceBody: false,
      includesLocalPath: false,
      allowedFields: Object.freeze([
        'resourceId',
        'resourceKind',
        'license',
        'sha256',
        'trustStatus',
        'revocationStatus',
      ]),
    }),
    productionLine: Object.freeze({
      actions: Object.freeze([
        'discover',
        'inspect',
        'trust-check',
        'import-proposal',
        'human-confirmation',
        'attach-resource-ref',
      ]),
      nextPilot: 'W-art-P23 gallery / author adoption input',
    }),
  };

  const state = determinePipelineState(summary);
  return Object.freeze({
    ...summary,
    productionLine: Object.freeze({
      ...summary.productionLine,
      state,
      p23Ready: state === 'ready',
    }),
  });
}

/**
 * 将官方资源生产线摘要格式化为稳定的多行文本。
 *
 * @param {Object} summary `createStudioResourcePipelineSummary()` 的输出。
 * @returns {string} metadata-only 摘要文本。
 */
export function formatStudioResourcePipelineSummary(summary) {
  const byKind = summary.officialMaterials?.byKind || {};
  const kindText = Object.keys(byKind).sort().map((kind) => `${kind}:${byKind[kind]}`).join(', ') || '--';
  const licenseText = summary.officialMaterials?.licenseExpressions?.join(', ') || '--';
  return [
    `pipelineState: ${summary.productionLine?.state || 'unknown'}`,
    `p23Ready: ${Boolean(summary.productionLine?.p23Ready)}`,
    `resources: ${summary.officialMaterials?.verified ?? 0}/${summary.officialMaterials?.total ?? 0} verified`,
    `importable: ${summary.officialMaterials?.importable ?? 0}`,
    `revoked: ${summary.officialMaterials?.revoked ?? 0}`,
    `kinds: ${kindText}`,
    `licenses: ${licenseText}`,
    `trustStatus: ${summary.trustChain?.status || 'unknown'}`,
    `keyId: ${summary.trustChain?.keyId || '--'}`,
    `metadataOnly: ${Boolean(summary.evidence?.metadataOnly)}`,
    `includesSourceBody: ${Boolean(summary.evidence?.includesSourceBody)}`,
    `includesLocalPath: ${Boolean(summary.evidence?.includesLocalPath)}`,
    `nextPilot: ${summary.productionLine?.nextPilot || '--'}`,
  ].join('\n');
}

//#endregion
