/**
 * ============================================================================
 * 🟦 Platform adapter contracts
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Defines the boundary between pure UnicodeArt algorithms and host-specific
 * image/font/text rendering implementations.
 * ============================================================================
 */

import type { CharMatrix, CharsetConfig } from '../types/charset';
import type { Interpolation } from '../types/config';
import type { CoreImageData } from '../types/image';

//#region 🟦 Text Rendering

export interface TextRenderOptions {
  font: string;
  fontSize: number;
  width: number;
  height: number;
  textAlign?: string;
  lineSpacing?: number;
  heightMode?: string;
  fontReduce?: number;
  rectunit?: number;
  lineSpacingPixels?: number;
}

export interface TextMeasureOptions {
  font: string;
  fontSize: number;
  fontReduce?: number;
}

//#endregion

//#region 🟦 Character Rendering

export interface CharRenderOptions {
  matrixSize: number;
  font: string;
  fontSize: number;
  fontReduce?: number;
  interpolation?: Interpolation;
  ratio?: number;
}

export interface PrecomputeCharDataOptions {
  charset: CharsetConfig;
  matrixSize: number;
  font: string;
  fontSize?: number;
  fontReduce?: number;
  interpolation?: Interpolation;
  ratio?: number;
  fontStyle?: string;
}

//#endregion

//#region 🟦 Unified Adapter

export interface UnicodeArtPlatformAdapter {
  loadImage(input: unknown): Promise<CoreImageData>;
  resizeImage?(
    image: CoreImageData,
    targetWidth: number,
    targetHeight: number,
    interpolation?: string
  ): Promise<CoreImageData>;
  renderTextToImage(text: string, options: TextRenderOptions): Promise<CoreImageData>;
  measureTextWidth(text: string, options: TextMeasureOptions): Promise<number>;
  renderCharToMatrix(char: string, options: CharRenderOptions): Promise<Float32Array>;
  precomputeCharData(options: PrecomputeCharDataOptions): Promise<Map<string, CharMatrix>>;
  loadFont(font: string, fontStyle?: string): Promise<string>;
}

//#endregion
