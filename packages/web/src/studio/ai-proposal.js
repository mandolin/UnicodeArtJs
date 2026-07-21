/**
 * ============================================================================
 * 🟦 Web Studio Alpha AI Proposal Preview
 * ============================================================================
 *
 * 🔶 模块职责
 * 为 Web Studio Alpha 提供 deterministic mock provider 的 AI proposal preview。
 * 这里不接真实外部 AI、不调用网络、不读取源码全文，也不直接写项目或工作区。
 *
 * 🔶 安全边界
 * - 输入只包含 CellCanvas 的摘要级上下文和用户请求。
 * - 输出只包含 draft / diagnostic / review-metadata / patch-preview。
 * - accepted-by-user 只代表用户认可预览，仍需宿主 checked apply。
 *
 * @module @unicode-art/web/studio/ai-proposal
 * @license MIT
 * ============================================================================
 */

import { getActiveCellMap } from '../cellcanvas.js';

//#region 🟩 常量

/** AI provider review payload 的内部 schema。 */
export const STUDIO_AI_REVIEW_PAYLOAD_SCHEMA = 'unicodeartjs-studio-provider-review-payload@0';

/** AI proposal preview 的内部 schema。 */
export const STUDIO_AI_PROPOSAL_SCHEMA = 'unicodeartjs-studio-ai-proposal';

/** P18.6 首轮仍是内部实验能力。 */
export const STUDIO_AI_PROPOSAL_STABILITY = 'internal-experimental';

/** 首轮只启用确定性 mock provider。 */
export const STUDIO_AI_PROVIDER_KIND = 'deterministic-mock';

/** provider 允许输出的四类 review-only 结果。 */
export const STUDIO_AI_ALLOWED_OUTPUT_KINDS = Object.freeze([
  'draft',
  'diagnostic',
  'review-metadata',
  'patch-preview',
]);

//#endregion

//#region 🟩 基础工具

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  const integer = Number.isFinite(number) ? Math.trunc(number) : fallback;
  return Math.min(Math.max(integer, min), max);
}

function normalizeSelection(selection, cellMap) {
  const x = clampInteger(selection?.x, 0, cellMap.width - 1, 0);
  const y = clampInteger(selection?.y, 0, cellMap.height - 1, 0);
  const width = clampInteger(selection?.width, 1, cellMap.width - x, 1);
  const height = clampInteger(selection?.height, 1, cellMap.height - y, 1);
  return { x, y, width, height };
}

function normalizeRequestText(text) {
  const normalized = String(text || '').trim();
  return normalized || 'Preview a safe CellMap patch for the current selection.';
}

function pickPreviewChar(requestText) {
  const chars = Array.from(requestText).filter((char) => /\S/u.test(char));
  return chars[0] ?? '#';
}

function createProposalId(payload) {
  const documentId = payload.documentContext?.documentId || 'document';
  const layerId = payload.documentContext?.activeLayerId || 'layer';
  const x = payload.documentContext?.selectionBounds?.x ?? 0;
  const y = payload.documentContext?.selectionBounds?.y ?? 0;
  return `proposal-${documentId}-${layerId}-${x}-${y}`;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

//#endregion

//#region 🟩 Payload 构造

/**
 * 从 CellCanvas 草稿创建 summary-only provider review payload。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {{
 *   userRequest?: string,
 *   locale?: string,
 *   projectId?: string,
 *   resourceEntryIds?: string[],
 *   trustSummary?: string,
 *   licenseSummary?: string,
 *   provenanceSummary?: string
 * }} [options] 预览选项。
 * @returns {object} provider review payload。
 */
export function createStudioAiReviewPayloadFromCellCanvasDraft(draft, options = {}) {
  const cellMap = getActiveCellMap(draft);
  const document = draft.document || {};
  const selection = normalizeSelection(
    draft.editorSession?.selection ?? draft.editorSession?.activeCell,
    cellMap,
  );
  const activeLayerId = draft.editorSession?.activeLayerId
    || document.layers?.[0]?.id
    || 'layer-main';
  const activeFrameId = draft.editorSession?.activeFrameId
    || document.frames?.[0]?.id
    || 'frame-static';
  const resourceEntryIds = Array.isArray(options.resourceEntryIds)
    ? options.resourceEntryIds.map((id) => String(id)).filter(Boolean)
    : [];

  return freezeDeep({
    schema: STUDIO_AI_REVIEW_PAYLOAD_SCHEMA,
    stage: 'W-art-P18.6',
    provider: {
      kind: STUDIO_AI_PROVIDER_KIND,
      identity: 'unicodeartjs-web-mock-provider',
      network: 'none',
      apiKeyRequired: false,
    },
    projectSummary: {
      projectId: options.projectId || 'web-editor-session',
      capsuleVersion: 'studio-project@0',
      surface: 'web',
    },
    documentContext: {
      documentId: document.id || 'cellcanvas-draft',
      documentVersion: document.version || 'uadm-0',
      activeLayerId,
      activeFrameId,
      canvasSize: {
        width: cellMap.width,
        height: cellMap.height,
      },
      selectionBounds: selection,
    },
    resourceContext: {
      resourceEntryIds,
      trustSummary: options.trustSummary || 'no resource entry selected',
      licenseSummary: options.licenseSummary || 'no new external resource introduced',
      provenanceSummary: options.provenanceSummary || 'local Web editor summary only',
    },
    userRequest: {
      text: normalizeRequestText(options.userRequest),
      locale: options.locale || 'zh-CN',
    },
  });
}

//#endregion

//#region 🟩 Proposal 构造与状态转换

/**
 * 由 deterministic mock provider 生成 AI proposal preview。
 *
 * @param {object} payload summary-only provider review payload。
 * @returns {object} review-only AI proposal。
 */
export function createDeterministicStudioAiProposal(payload) {
  const selection = payload.documentContext.selectionBounds;
  const previewChar = pickPreviewChar(payload.userRequest.text);
  const resourceEntryIds = payload.resourceContext?.resourceEntryIds ?? [];
  const proposalId = createProposalId(payload);

  return freezeDeep({
    schema: STUDIO_AI_PROPOSAL_SCHEMA,
    stage: 'W-art-P18.6',
    stability: STUDIO_AI_PROPOSAL_STABILITY,
    id: proposalId,
    status: 'preview-ready',
    provider: payload.provider,
    policy: {
      allowedOutputKinds: STUDIO_AI_ALLOWED_OUTPUT_KINDS,
      sourcesContentAllowed: false,
      fullDocumentsAllowed: false,
      workspaceWriteAllowed: false,
      providerDirectApplyAllowed: false,
      networkAllowed: false,
      acceptedByUserStillRequiresHostCheckedApply: true,
    },
    outputs: [
      {
        kind: 'draft',
        title: 'CellMap patch preview',
        summary: `Preview a single-cell suggestion for (${selection.x}, ${selection.y}).`,
      },
      {
        kind: 'diagnostic',
        code: 'UA_STUDIO_AI_REVIEW_ONLY',
        severity: 'info',
        targetRef: `${payload.documentContext.documentId}#${payload.documentContext.activeFrameId}`,
        message: 'Proposal is review-only and requires host checked apply.',
      },
      {
        kind: 'review-metadata',
        risk: 'low',
        quality: 'preview-only',
        licenseSummary: payload.resourceContext.licenseSummary,
        trustSummary: payload.resourceContext.trustSummary,
        compatibility: 'uadm-0 cellmap patch preview',
      },
      {
        kind: 'patch-preview',
        previewId: `${proposalId}-patch`,
        documentId: payload.documentContext.documentId,
        documentVersion: payload.documentContext.documentVersion,
        targetLayerId: payload.documentContext.activeLayerId,
        targetFrameId: payload.documentContext.activeFrameId,
        resourceEntryIds,
        trustSummary: payload.resourceContext.trustSummary,
        rollbackHint: {
          strategy: 'host-record-before-cells',
          historyKind: 'ai-preview-cellmap-patch',
          requiresHostRollbackRecord: true,
        },
        preflightStatus: 'host-check-required',
        previewOnly: true,
        changesSummary: [
          {
            op: 'set-cell',
            x: selection.x,
            y: selection.y,
            char: previewChar,
          },
        ],
      },
    ],
  });
}

/**
 * 转换 proposal 审查状态。
 *
 * @param {object} proposal 原始 proposal。
 * @param {'accept' | 'reject'} action 用户动作。
 * @returns {object} 更新后的 proposal。
 */
export function transitionStudioAiProposalReview(proposal, action) {
  const nextStatus = action === 'accept' ? 'host-checked-apply-required' : 'rejected';
  return freezeDeep({
    ...proposal,
    status: nextStatus,
    review: {
      action: action === 'accept' ? 'accepted-by-user' : 'rejected-by-user',
      acceptedByUserDoesNotWrite: action === 'accept',
      hostCheckedApplyRequired: action === 'accept',
    },
  });
}

//#endregion

//#region 🟩 展示摘要

/**
 * 生成 AI proposal preview 的可读摘要。
 *
 * @param {object} payload provider review payload。
 * @param {object} proposal AI proposal。
 * @returns {string} 多行摘要。
 */
export function formatStudioAiProposalSummary(payload, proposal) {
  const patch = proposal.outputs.find((output) => output.kind === 'patch-preview');
  const changes = patch?.changesSummary
    ?.map((change) => `${change.op}(${change.x},${change.y})=${change.char}`)
    .join(', ') || '--';
  return [
    `schema: ${proposal.schema}`,
    `stage: ${proposal.stage}`,
    `provider: ${proposal.provider.kind}`,
    `network: ${proposal.provider.network}`,
    `status: ${proposal.status}`,
    `documentId: ${payload.documentContext.documentId}`,
    `documentVersion: ${payload.documentContext.documentVersion}`,
    `selection: ${payload.documentContext.selectionBounds.x},${payload.documentContext.selectionBounds.y} ${payload.documentContext.selectionBounds.width}x${payload.documentContext.selectionBounds.height}`,
    `resourceEntryIds: ${payload.resourceContext.resourceEntryIds.join(', ') || '--'}`,
    `allowedOutputs: ${proposal.policy.allowedOutputKinds.join(', ')}`,
    `preflightStatus: ${patch?.preflightStatus || '--'}`,
    `previewOnly: ${patch?.previewOnly === true}`,
    `changesSummary: ${changes}`,
    `sourcesContentAllowed: ${proposal.policy.sourcesContentAllowed}`,
    `workspaceWriteAllowed: ${proposal.policy.workspaceWriteAllowed}`,
    `providerDirectApplyAllowed: ${proposal.policy.providerDirectApplyAllowed}`,
    `acceptedByUserStillRequiresHostCheckedApply: ${proposal.policy.acceptedByUserStillRequiresHostCheckedApply}`,
  ].join('\n');
}

//#endregion
