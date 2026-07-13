/**
 * ============================================================================
 * 🟦 Canvas 字体族工具
 * ============================================================================
 *
 * 🔶 模块职责
 * 将用户配置的单一字体名或 CSS 字体回退列表安全地拼入 Canvas font 简写。
 *
 * 🔶 关键约束
 * Canvas 的 font-family 语法与 CSS 一致。包含逗号的回退列表必须保持原样；
 * 若将整个列表再包进一对引号，浏览器会把它误认为一个不存在的字体名，
 * 最终回退为默认字体。
 * ============================================================================
 */

/**
 * 🟢 规范化 Canvas font 简写中的字体族部分。
 *
 * @param font 单个字体名，或符合 CSS font-family 语法的回退列表
 * @returns 可直接拼入 `${size}px ${family}` 的字体族字符串
 */
export function formatCanvasFontFamily(font: string | undefined): string {
  const normalized = font?.trim();
  return normalized || 'monospace';
}
