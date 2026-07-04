import type { ExtensionArtConfig } from '../config/types';
import type { InsertMode } from '../output/resultWriter';

export interface TemplateSlotView {
  slot: number;
  label: string;
  configured: boolean;
  preset?: string;
}

export interface InitialWebviewState {
  config: ExtensionArtConfig;
  templates: {
    defaultConfigured: boolean;
    slots: TemplateSlotView[];
  };
  i18n: Record<string, string>;
  options: {
    charsets: string[];
    boxStyles: string[];
    insertModes: InsertMode[];
    visualFonts: string[];
    glyphFonts: string[];
    outputTargets: ExtensionArtConfig['outputTarget'][];
    locales: ExtensionArtConfig['locale'][];
  };
}

export interface ConvertTextPayload {
  text: string;
  config?: Partial<ExtensionArtConfig>;
  requestId?: string;
}

export interface ConvertImagePayload {
  imageData?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  config?: Partial<ExtensionArtConfig>;
  requestId?: string;
}

export type SaveFormat = 'txt' | 'html';
export type PresetSaveTarget = 'recent' | 'default' | 'slot';

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'convertText'; payload: ConvertTextPayload }
  | { type: 'convertImage'; payload: ConvertImagePayload }
  | { type: 'cancel'; payload: { requestId: string } }
  | { type: 'savePreset'; payload: { config: ExtensionArtConfig; target?: PresetSaveTarget; slot?: number } }
  | { type: 'copy'; payload: { content: string } }
  | { type: 'insert'; payload: { content: string; mode: InsertMode } }
  | { type: 'save'; payload: { content: string; format: SaveFormat; glyphFont?: string } };

export type ExtensionMessage =
  | { type: 'readyAck'; payload: InitialWebviewState }
  | { type: 'progress'; payload: { stage: string; progress: number } }
  | { type: 'result'; payload: { content: string; rows: number; cols: number; source: 'text' | 'image' } }
  | { type: 'templateState'; payload: InitialWebviewState['templates'] }
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'notice'; payload: { message: string } };

export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'ready':
      return true;
    case 'convertText':
      return isRecord(value.payload) && typeof value.payload.text === 'string';
    case 'convertImage':
      return isRecord(value.payload);
    case 'cancel':
      return isRecord(value.payload) && typeof value.payload.requestId === 'string';
    case 'savePreset':
      return isRecord(value.payload) && isRecord(value.payload.config);
    case 'copy':
      return isRecord(value.payload) && typeof value.payload.content === 'string';
    case 'insert':
      return isRecord(value.payload) &&
        typeof value.payload.content === 'string' &&
        typeof value.payload.mode === 'string';
    case 'save':
      return isRecord(value.payload) &&
        typeof value.payload.content === 'string' &&
        (value.payload.format === 'txt' || value.payload.format === 'html');
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
