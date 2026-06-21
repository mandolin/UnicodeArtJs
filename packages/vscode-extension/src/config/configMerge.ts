import type { ExtensionArtConfig } from './types';

export function mergeExtensionConfig(
  base: ExtensionArtConfig,
  patch: Partial<ExtensionArtConfig> | undefined
): ExtensionArtConfig {
  if (!patch) return base;

  return {
    ...base,
    ...patch,
    box: patch.box === undefined ? base.box : patch.box,
  };
}
