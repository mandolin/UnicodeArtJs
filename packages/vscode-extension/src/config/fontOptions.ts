export const VISUAL_FONT_OPTIONS = [
  'Noto Sans SC',
  'Source Han Sans SC',
  'Noto Sans',
  'Sarasa Gothic SC',
  'LXGW WenKai',
  'Roboto',
  'Liberation Sans',
  'sans-serif',
];

export const GLYPH_FONT_OPTIONS = [
  "'Sarasa Mono SC', 等距更纱黑体 SC, monospace",
  "'LXGW WenKai Mono', 霞鹜文楷等宽, monospace",
  "'Source Code Pro', 'Liberation Mono', monospace",
  "'Fira Code', 'Source Code Pro', monospace",
  "'JetBrains Mono', 'Source Code Pro', monospace",
  "'Iosevka', 'Source Code Pro', monospace",
  'monospace',
];

const VISUAL_FONT_ALIASES: Record<string, string> = {
  黑体: 'SimHei',
  宋体: 'SimSun',
  新宋体: 'NSimSun',
  微软雅黑: 'Microsoft YaHei',
  楷体: 'KaiTi',
  仿宋: 'FangSong',
};

export function normalizeVisualFontFamily(font: string | undefined): string {
  const trimmed = (font || 'Noto Sans SC').trim();
  return VISUAL_FONT_ALIASES[trimmed] || trimmed;
}
