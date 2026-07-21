/**
 * Web Studio project capsule 内部原型。
 *
 * 该模块把现有 CellCanvas 草稿包进 `studio-project@0` 项目级 envelope，
 * 供 P18.4 的保存、加载和本地恢复边界复用。它不声明公开稳定文件格式。
 */

import {
  CELL_CANVAS_DRAFT_SCHEMA,
  readCellCanvasDraftFromProjectEnvelope,
  validateCellCanvasDocumentDraft,
} from '../cellcanvas.js';

// #region 常量

/** @type {string} Studio project capsule schema。 */
export const STUDIO_PROJECT_SCHEMA = 'unicodeartjs-studio-project';

/** @type {string} Studio project capsule 内部版本。 */
export const STUDIO_PROJECT_VERSION = 'studio-project@0';

/** @type {string} Studio project capsule 稳定性标记。 */
export const STUDIO_PROJECT_STABILITY = 'internal-experimental';

/** @type {string} Studio project 本地恢复摘要 schema。 */
export const STUDIO_PROJECT_RESTORE_SUMMARY_SCHEMA = 'unicodeartjs-studio-project-restore-summary@0';

// #endregion

// #region 工具函数

/**
 * 创建 JSON 深拷贝。
 *
 * @template T
 * @param {T} value 待复制值。
 * @returns {T} 独立副本。
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 判断值是否为普通对象。
 *
 * @param {unknown} value 候选值。
 * @returns {value is Record<string, unknown>} 是否为对象。
 */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 规范化非空字符串。
 *
 * @param {unknown} value 候选值。
 * @param {string} fallback 兜底值。
 * @returns {string} 字符串。
 */
function normalizeString(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

/**
 * 规范化 ISO 时间戳。
 *
 * @param {unknown} value 候选时间。
 * @param {string} fallback 兜底时间。
 * @returns {string} ISO 时间。
 */
function normalizeIsoTimestamp(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallback : new Date(time).toISOString();
}

/**
 * 判断 URI 是否可能泄漏本机绝对路径。
 *
 * @param {unknown} value 候选 URI。
 * @returns {boolean} 是否为危险 URI。
 */
function isUnsafeLocalUri(value) {
  const text = String(value ?? '').trim();
  return /^[a-zA-Z]:[\\/]/.test(text)
    || text.startsWith('/')
    || text.startsWith('\\')
    || /^file:/i.test(text)
    || text.includes('..')
    || text.includes('\\');
}

/**
 * 规范化资源 URI，只保留低敏相对路径或文件名。
 *
 * @param {unknown} value 候选 URI。
 * @returns {string | undefined} 安全 URI。
 */
function sanitizeResourceUri(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || isUnsafeLocalUri(text)) return undefined;
  return text;
}

/**
 * 从来源资源中提取可写入 capsule 的资源引用。
 *
 * @param {unknown} value 来源资源。
 * @returns {object | undefined} 资源引用。
 */
function sanitizeStudioResourceRef(value) {
  if (!isObject(value)) return undefined;

  const id = normalizeString(value.id ?? value.resourceId, 'resource-main');
  const kind = normalizeString(value.kind, 'cell-document');
  const resource = {
    id,
    kind,
  };

  if (typeof value.title === 'string' && value.title.trim()) {
    resource.title = value.title.trim();
  }

  const uri = sanitizeResourceUri(value.uri ?? value.source ?? value.fileName);
  if (uri) {
    resource.source = {
      type: normalizeString(value.sourceType ?? value.type, 'imported'),
      uri,
    };
  }

  const sha256 = typeof value.sha256 === 'string'
    ? value.sha256.trim()
    : isObject(value.hash) && typeof value.hash.value === 'string'
      ? value.hash.value.trim()
      : '';
  if (sha256) {
    resource.hash = {
      algorithm: 'sha256',
      value: sha256,
    };
  }

  const trustStatus = typeof value.trust === 'string'
    ? value.trust.trim()
    : isObject(value.trustChain) && typeof value.trustChain.status === 'string'
      ? value.trustChain.status.trim()
      : '';
  if (trustStatus) {
    resource.trustChain = {
      status: trustStatus,
      revoked: value.revoked === true || value.trustChain?.revoked === true,
    };
  }

  const licenseExpression = typeof value.license === 'string'
    ? value.license.trim()
    : isObject(value.license) && typeof value.license.expression === 'string'
      ? value.license.expression.trim()
      : '';
  if (licenseExpression) {
    resource.license = {
      expression: licenseExpression,
      noticeRequired: value.noticeRequired === true || value.license?.noticeRequired === true,
    };
  }

  return resource;
}

/**
 * 校验 Studio project 资源引用中的路径边界。
 *
 * @param {object} resource 资源引用。
 */
function validateStudioResourceRef(resource) {
  if (!isObject(resource)) throw new Error('Studio project resource must be an object.');
  if (typeof resource.id !== 'string' || !resource.id.trim()) {
    throw new Error('Studio project resource.id must be a non-empty string.');
  }
  if (resource.source?.uri && isUnsafeLocalUri(resource.source.uri)) {
    throw new Error('Studio project resource source.uri must not contain local absolute paths.');
  }
}

/**
 * 读取 capsule 中的活动文档条目。
 *
 * @param {object} capsule Studio project capsule。
 * @returns {object} 活动文档条目。
 */
function getActiveDocumentEntry(capsule) {
  if (!Array.isArray(capsule.documents) || capsule.documents.length === 0) {
    throw new Error('Studio project must contain at least one document.');
  }

  const activeDocumentId = typeof capsule.activeDocumentId === 'string' ? capsule.activeDocumentId : '';
  const entry = capsule.documents.find((document) => document?.id === activeDocumentId) ?? capsule.documents[0];
  if (!isObject(entry)) throw new Error('Studio project active document must be an object.');
  if (entry.kind !== 'cellcanvas-draft') {
    throw new Error('Studio project active document kind must be cellcanvas-draft.');
  }
  if (!isObject(entry.draft)) {
    throw new Error('Studio project active document must contain a draft.');
  }
  return entry;
}

// #endregion

// #region Capsule 创建与读取

/**
 * 判断对象是否为 Studio project capsule。
 *
 * @param {unknown} input 候选对象。
 * @returns {boolean} 是否为 Studio project capsule。
 */
export function isStudioProjectCapsule(input) {
  return isObject(input) && input.schema === STUDIO_PROJECT_SCHEMA;
}

/**
 * 创建 `studio-project@0` 内部项目包络。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {{
 *   appVersion?: string,
 *   surface?: string,
 *   projectId?: string,
 *   projectTitle?: string,
 *   documentId?: string,
 *   locale?: string,
 *   createdAt?: string,
 *   updatedAt?: string,
 *   sourceResource?: object
 * }} [options] 项目元数据。
 * @returns {object} Studio project capsule。
 */
export function createStudioProjectCapsuleFromCellCanvasDraft(draft, options = {}) {
  const summary = validateCellCanvasDocumentDraft(draft);
  const now = new Date().toISOString();
  const createdAt = normalizeIsoTimestamp(options.createdAt, now);
  const updatedAt = normalizeIsoTimestamp(options.updatedAt, createdAt);
  const documentId = normalizeString(options.documentId ?? draft.document?.id, 'doc-main');
  const projectId = normalizeString(options.projectId, `studio-${documentId}`);
  const resource = sanitizeStudioResourceRef(options.sourceResource);
  const sourceResourceIds = resource ? [resource.id] : [];
  const documentEntry = {
    id: documentId,
    title: normalizeString(options.projectTitle ?? draft.document?.title, 'Untitled Studio Project'),
    kind: 'cellcanvas-draft',
    draft: cloneJson(draft),
  };

  if (sourceResourceIds.length > 0) {
    documentEntry.sourceResourceIds = sourceResourceIds;
    documentEntry.provenanceRef = 'provenance-main';
  }

  const capsule = {
    schema: STUDIO_PROJECT_SCHEMA,
    version: STUDIO_PROJECT_VERSION,
    stability: STUDIO_PROJECT_STABILITY,
    publicStableFormatDeclared: false,
    filenameCandidate: 'unicode-art-studio.uart-project.json',
    project: {
      id: projectId,
      title: documentEntry.title,
      locale: normalizeString(options.locale, 'zh-CN'),
    },
    app: {
      id: 'unicodeartjs',
      surface: normalizeString(options.surface, 'web'),
      version: normalizeString(options.appVersion, '0.0.0-internal'),
    },
    metadata: {
      createdAt,
      updatedAt,
      documents: 1,
      width: summary.width,
      height: summary.height,
      source: 'web-cellcanvas-save',
    },
    activeDocumentId: documentId,
    documents: [documentEntry],
    exportSettings: cloneJson(draft.document?.exportSettings ?? {}),
    diagnostics: [
      {
        code: 'UA_STUDIO_PROJECT_INTERNAL',
        severity: 'info',
        message: 'Studio project capsule is internal experimental data.',
      },
    ],
  };

  if (resource) {
    capsule.resources = [resource];
    capsule.provenance = {
      id: 'provenance-main',
      kind: 'web-cellcanvas-project',
      sourceResourceIds,
      importedAt: createdAt,
      updatedAt,
    };
  }

  return capsule;
}

/**
 * 校验 Studio project capsule 并返回摘要。
 *
 * @param {object} capsule Studio project capsule。
 * @returns {object} 摘要。
 */
export function validateStudioProjectCapsule(capsule) {
  if (!isStudioProjectCapsule(capsule)) {
    throw new Error(`Studio project schema must be ${STUDIO_PROJECT_SCHEMA}.`);
  }
  if (capsule.version !== STUDIO_PROJECT_VERSION) {
    throw new Error(`Studio project version must be ${STUDIO_PROJECT_VERSION}.`);
  }
  if (capsule.stability !== STUDIO_PROJECT_STABILITY) {
    throw new Error(`Studio project stability must be ${STUDIO_PROJECT_STABILITY}.`);
  }
  if (capsule.publicStableFormatDeclared === true) {
    throw new Error('Studio project must not declare a public stable format.');
  }
  if (!isObject(capsule.project) || typeof capsule.project.id !== 'string' || !capsule.project.id.trim()) {
    throw new Error('Studio project.project.id must be a non-empty string.');
  }
  if (!isObject(capsule.metadata)) {
    throw new Error('Studio project metadata must be an object.');
  }
  if (Number.isNaN(Date.parse(capsule.metadata.createdAt))) {
    throw new Error('Studio project metadata.createdAt must be an ISO timestamp.');
  }
  if (Number.isNaN(Date.parse(capsule.metadata.updatedAt))) {
    throw new Error('Studio project metadata.updatedAt must be an ISO timestamp.');
  }

  for (const resource of capsule.resources ?? []) validateStudioResourceRef(resource);

  const activeEntry = getActiveDocumentEntry(capsule);
  const draftSummary = validateCellCanvasDocumentDraft(activeEntry.draft);
  return {
    schema: capsule.schema,
    version: capsule.version,
    projectId: capsule.project.id,
    activeDocumentId: activeEntry.id,
    documents: capsule.documents.length,
    width: draftSummary.width,
    height: draftSummary.height,
    cells: draftSummary.cells,
  };
}

/**
 * 从 Studio project capsule 读取活动 CellCanvas 草稿。
 *
 * @param {object} capsule Studio project capsule。
 * @returns {object} CellCanvas 草稿副本。
 */
export function readCellCanvasDraftFromStudioProjectCapsule(capsule) {
  validateStudioProjectCapsule(capsule);
  return cloneJson(getActiveDocumentEntry(capsule).draft);
}

/**
 * 从 Studio / CellCanvas 项目包络或 raw draft 中读取 CellCanvas 草稿。
 *
 * @param {object} input 项目包络或 raw draft。
 * @returns {object} CellCanvas 草稿副本。
 */
export function readCellCanvasDraftFromStudioSource(input) {
  if (isStudioProjectCapsule(input)) {
    return readCellCanvasDraftFromStudioProjectCapsule(input);
  }
  if (input?.schema === CELL_CANVAS_DRAFT_SCHEMA) {
    return readCellCanvasDraftFromProjectEnvelope(input);
  }
  return readCellCanvasDraftFromProjectEnvelope(input);
}

/**
 * 创建 Web 本地恢复摘要。
 *
 * 摘要只用于 UI / gate 判断，不包含完整草稿数据，不替代 project capsule。
 *
 * @param {object} capsule Studio project capsule。
 * @param {{ existingUpdatedAt?: string, storageKey?: string }} [options] 恢复选项。
 * @returns {object} 恢复摘要。
 */
export function createStudioProjectRestoreSummary(capsule, options = {}) {
  const summary = validateStudioProjectCapsule(capsule);
  const projectUpdatedAt = Date.parse(capsule.metadata.updatedAt);
  const existingUpdatedAt = Date.parse(options.existingUpdatedAt ?? '');
  const conflictHint = Number.isFinite(existingUpdatedAt) && existingUpdatedAt > projectUpdatedAt
    ? 'target-newer'
    : 'none';

  return {
    schema: STUDIO_PROJECT_RESTORE_SUMMARY_SCHEMA,
    stability: STUDIO_PROJECT_STABILITY,
    projectId: summary.projectId,
    activeDocumentId: summary.activeDocumentId,
    title: normalizeString(capsule.project?.title, 'Untitled Studio Project'),
    updatedAt: capsule.metadata.updatedAt,
    documentCount: summary.documents,
    sourceResourceIds: getActiveDocumentEntry(capsule).sourceResourceIds ?? [],
    draft: {
      schema: CELL_CANVAS_DRAFT_SCHEMA,
      width: summary.width,
      height: summary.height,
      cells: summary.cells,
    },
    localRestore: {
      canRestore: true,
      preferredStorageKey: normalizeString(options.storageKey, 'unicode-art-editor-workspace-v1'),
      storesDraftOnly: true,
      conflictHint,
    },
  };
}

// #endregion
