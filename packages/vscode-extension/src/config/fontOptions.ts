export const VISUAL_FONT_OPTIONS = [
  'Arial',
  'SimHei',
  'SimSun',
  'NSimSun',
  'Microsoft YaHei',
  'KaiTi',
  'FangSong',
  '黑体',
  '宋体',
  '新宋体',
  '微软雅黑',
  '楷体',
  '仿宋',
];

export const GLYPH_FONT_OPTIONS = [
  "Consolas, 'Courier New', monospace",
  'NSimSun, 新宋体, monospace',
  "'Sarasa Mono SC', 等距更纱黑体 SC, monospace",
  "'LXGW WenKai Mono', 霞鹜文楷等宽, monospace",
  "Menlo, Monaco, 'Courier New', monospace",
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
  const trimmed = (font || 'Arial').trim();
  return VISUAL_FONT_ALIASES[trimmed] || trimmed;
}
