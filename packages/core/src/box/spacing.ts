/**
 * ============================================================================
 * Box spacing helpers
 * ============================================================================
 *
 * Normalizes number or per-side spacing values into a strict four-side object.
 *
 * @module box/spacing
 * @since 1.0.0
 * ============================================================================
 */

import type { BoxSpacing, SpacingValue } from './types';

//#region Spacing helpers

export const ZERO_SPACING: BoxSpacing = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

/**
 * 🟢 归一化裱框间距
 *
 * 🔹 支持单个数字或四边局部对象，最终返回完整的 top/right/bottom/left 结构。
 *
 * @param value - 用户传入的间距值。
 * @param fallback - 未指定边时使用的默认值。
 * @returns 完整四边距对象。
 *
 * @throws 当任意边不是非负整数时抛出 `Error`。
 */
export function normalizeSpacing(value: SpacingValue | undefined, fallback: number = 0): BoxSpacing {
  if (value === undefined) {
    return spacingFromNumber(fallback);
  }

  if (typeof value === 'number') {
    return spacingFromNumber(value);
  }

  return {
    top: normalizeSpacingSide(value.top, fallback, 'top'),
    right: normalizeSpacingSide(value.right, fallback, 'right'),
    bottom: normalizeSpacingSide(value.bottom, fallback, 'bottom'),
    left: normalizeSpacingSide(value.left, fallback, 'left')
  };
}

function spacingFromNumber(value: number): BoxSpacing {
  const normalized = normalizeSpacingSide(value, 0, 'spacing');
  return {
    top: normalized,
    right: normalized,
    bottom: normalized,
    left: normalized
  };
}

function normalizeSpacingSide(value: number | undefined, fallback: number, name: string): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < 0) {
    throw new Error(`Invalid box ${name}: expected a non-negative integer`);
  }

  return candidate;
}

/**
 * 🟢 判断四边距中是否存在非零值
 *
 * @param spacing - 已归一化的四边距对象。
 * @returns `true` 表示至少一边大于零。
 */
export function hasSpacing(spacing: BoxSpacing): boolean {
  return spacing.top > 0 || spacing.right > 0 || spacing.bottom > 0 || spacing.left > 0;
}

//#endregion
