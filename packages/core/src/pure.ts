/**
 * ============================================================================
 * Platform-independent UnicodeArtJs Core entry.
 *
 * 导出浏览器适配及其他自定义宿主可复用的纯算法、类型和格式工具。此入口不得导入 Node
 * 专用模块，也不自行加载图像或字体；宿主需要自行提供像素数据或平台 adapter。
 *
 * @packageDocumentation
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
  ArtConfig,
  GlyphFontConfig,
  OutputTarget,
  VisualFontConfig
} from './types/config';

export type {
  SemanticArtTextBlock,
  SemanticArtTextRenderer,
  SemanticBlock,
  SemanticBlockDisplay,
  SemanticCell,
  SemanticCellRole,
  SemanticDocument,
  SemanticDocumentOptions,
  SemanticDocumentV1,
  SemanticDocumentVersion,
  SemanticDslParseOptions,
  SemanticJsonParseOptions,
  SemanticRenderOptions,
  SemanticRow,
  SemanticRowRole,
  SemanticRowSeparatorMode
} from './types/semantic';

export type {
  ResolvedUnicodeArtFontGlyph,
  UnicodeArtFont,
  UnicodeArtFontCreation,
  UnicodeArtFontCreationMethod,
  UnicodeArtFontDirection,
  UnicodeArtFontExtensions,
  UnicodeArtFontFormat,
  UnicodeArtFontGlyph,
  UnicodeArtFontLicense,
  UnicodeArtFontLineMeasurement,
  UnicodeArtFontMeasureOptions,
  UnicodeArtFontMetadata,
  UnicodeArtFontMetrics,
  UnicodeArtFontOrigin,
  UnicodeArtFontParseOptions,
  UnicodeArtFontRenderOptions,
  UnicodeArtFontRenderResult,
  UnicodeArtFontTextMeasurement,
  UnicodeArtFontV1,
  UnicodeArtFontVersion
} from './types/artFont';

export type {
  UnicodeArtExtensionCapability,
  UnicodeArtExtensionCompatibility,
  UnicodeArtExtensionCompatibilityReason,
  UnicodeArtExtensionCompatibilityResult,
  UnicodeArtExtensionFormat,
  UnicodeArtExtensionHost,
  UnicodeArtExtensionManifest,
  UnicodeArtExtensionManifestV1,
  UnicodeArtExtensionMetadata,
  UnicodeArtExtensionParseOptions,
  UnicodeArtExtensionResource,
  UnicodeArtExtensionTarget,
  UnicodeArtExtensionVersion
} from './types/extension';

export {
  DEFAULT_CONFIG,
  FontStyle,
  HeightMode,
  Interpolation,
  normalizeArtConfigAliases,
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

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  formatMessage,
  isSupportedLocale,
  normalizeLocale,
  t
} from './i18n';

export type {
  MessageKey,
  MessageParams,
  SupportedLocale
} from './i18n';

export type {
  BrowserEntryCapabilities,
  BoxCapabilities,
  CoreCapabilities,
  CoreCapabilityDescriptor,
  CoreCapabilityStability,
  NodeImageBackendCapabilities
} from './capabilities';

export {
  getCoreCapabilities
} from './capabilities';

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

//#region 🟦 Version

export {
  VERSION
} from './version';

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

export type {
  BuiltInGlyphWidthProfile,
  GlyphWidthCalculatorOptions,
  GlyphWidthProfile,
  GlyphWidthProfileDefinition
} from './glyph/width';

export {
  BUILT_IN_GLYPH_WIDTH_PROFILES,
  createGlyphWidthCalculator,
  getGlyphWidthProfiles,
  isKnownGlyphWidthProfile,
  normalizeGlyphWidthProfile,
  normalizeWideCharRegex,
  GlyphWidthCalculator
} from './glyph/width';

export {
  parseSemanticDocumentJson,
  parseSemanticDsl,
  validateSemanticDocument
} from './semantic/document';

export {
  PERMISSIVE_UNICODE_ART_FONT_LICENSES,
  isPermissiveUnicodeArtFontLicense,
  isSpdxExpressionSyntax,
  parseUnicodeArtFontJson,
  validateUnicodeArtFont
} from './artFont/document';

export {
  getUnicodeArtFontGlyphDisplayWidth,
  measureUnicodeArtFontText,
  resolveUnicodeArtFontGlyph
} from './artFont/metrics';

export {
  renderUnicodeArtFontText
} from './artFont/render';

export {
  UNICODE_ART_FONT_FORMAT
} from './types/artFont';

export {
  UNICODE_ART_EXTENSION_FORMAT
} from './types/extension';

export {
  UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES,
  evaluateUnicodeArtExtensionCompatibility,
  isPermissiveUnicodeArtExtensionLicense,
  parseUnicodeArtExtensionManifestJson,
  validateUnicodeArtExtensionManifest
} from './extensions/document';

export {
  renderSemanticDocumentWithAdapter
} from './semantic/render';

export {
  normalizeSpacing,
  ZERO_SPACING
} from './box/spacing';

//#endregion
