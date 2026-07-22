/**
 * Web Studio Virtual Grid 兼容门面。
 *
 * 纯逻辑已经迁入内部 `@unicode-art/studio-kit`。Web 侧仍保留这个
 * 路径，是为了让现有 UI、测试和其它 staging 模块无需在同一阶段
 * 大规模改 import。DOM 滚动、键盘/鼠标事件、焦点、可访问性和渲染
 * 调度仍由 Web 宿主拥有。
 */

export {
  VIRTUAL_GRID_PROJECTION_SCHEMA,
  VIRTUAL_GRID_SESSION_PATCH_SCHEMA,
  getVirtualGridCellMapSummary,
  normalizeVirtualGridViewport,
  createVirtualGridProjection,
  hitTestVirtualGrid,
  createVirtualGridSessionPatch,
} from '@unicode-art/studio-kit/virtual-grid';
