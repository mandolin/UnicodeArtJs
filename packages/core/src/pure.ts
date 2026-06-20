/**
 * ============================================================================
 * 🟦 UnicodeArtJs pure core entry
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Exposes platform-independent APIs for browser adaptation and other hosts that
 * want to provide their own image/font adapters.
 *
 * 🔶 Import boundary
 * This entry must not import Node-only modules or modules that import them.
 * ============================================================================
 */

//#region 🟦 Types

export type {
  CoreImageData,
  ImageData,
  PixelCoord,
  Rect,
  SamplingArray,
  SamplingBlock
} from './types/image';

export type {
  CharMatrix,
  CharsetConfig
} from './types/charset';

export {
  CharType,
  PresetCharset
} from './types/charset';

export type {
  ArtConfig
} from './types/config';

export {
  DEFAULT_CONFIG,
  FontStyle,
  HeightMode,
  Interpolation,
  TextAlign
} from './types/config';

export type {
  ArtMetadata,
  ArtResult
} from './types/output';

export {
  ErrorCode,
  OutputFormat,
  UnicodeArtError
} from './types/output';

export type {
  BoxAlign,
  BoxCellOptions,
  BoxChars,
  BoxMode,
  BoxOptions,
  BoxOverflow,
  BoxRenderStage,
  BoxSeparatorOptions,
  BoxShadowOptions,
  BoxSpacing,
  BoxStyleDefinition,
  BoxStyleMetadata,
  BoxStyleName,
  BoxTitleOptions,
  BoxVerticalAlign,
  NormalizedBoxOptions,
  NormalizedBoxShadowOptions,
  NormalizedBoxTitleOptions,
  SpacingValue
} from './box/types';

//#endregion

//#region 🟦 Pure Conversion

export type {
  ImageDataToArtOptions
} from './pure/imageDataToArt';

export {
  imageDataToArt
} from './pure/imageDataToArt';

//#endregion

//#region 🟦 Pure Algorithms

export {
  calculateBlockSize,
  calculateOutputSize,
  extractBlock,
  generateSamplingArray,
  resizeAndNormalizeBlock,
  resizeInterpolate,
  nearestInterpolate,
  bilinearInterpolate
} from './sampler';

export {
  batchMatch,
  batchMatchParallel,
  calculateSAD,
  findBestMatchForBlock
} from './matcher';

export {
  assembleANSI,
  assembleHTML,
  assembleOutput,
  assemblePlainText,
  assembleTextOutput,
  escapeHTML,
  trimTrailingSpaces
} from './assembler';

//#endregion

//#region 🟦 Text and Box Utilities

export {
  calculateDisplayWidth,
  detectWideCharsInText
} from './utils/wideCharDetector';

export {
  boxText,
  normalizeBoxOptions,
  previewBoxStyle
} from './box/box';

export {
  BOX_STYLES,
  BOX_STYLE_METADATA,
  getBoxStyleMetadata,
  getBoxStyleNames,
  isBoxStyleName,
  resolveBoxChars
} from './box/styles';

export {
  cropToWidth,
  getGlyphWidth,
  padToWidth,
  repeatToWidth
} from './box/width';

export {
  normalizeSpacing,
  ZERO_SPACING
} from './box/spacing';

//#endregion
