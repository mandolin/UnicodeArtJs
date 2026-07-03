import { ErrorCode, UnicodeArtError } from '../src/types/output';
import { normalizeLocale, t } from '../src/i18n';

describe('UnicodeArtError', () => {
  test('serializes details for logs', () => {
    const error = new UnicodeArtError(
      '配置错误',
      ErrorCode.INVALID_CONFIG,
      { field: 'height' }
    );

    expect(error.toString()).toContain('[INVALID_CONFIG] 配置错误');
    expect(error.toString()).toContain('height');
    expect(error.toJSON()).toContain('"code":"INVALID_CONFIG"');
  });

  test('preserves i18n metadata for localized errors', () => {
    const error = new UnicodeArtError(
      t('config.height.positive', {}, 'en-US'),
      ErrorCode.INVALID_CONFIG,
      {
        details: { height: 0 },
        messageKey: 'config.height.positive',
        locale: 'en-US'
      }
    );

    expect(error.message).toBe('height must be greater than 0');
    expect(error.messageKey).toBe('config.height.positive');
    expect(error.locale).toBe('en-US');
    expect(error.details).toEqual({ height: 0 });
  });

  test('normalizes unsupported locales to zh-CN', () => {
    expect(normalizeLocale('en-US')).toBe('en-US');
    expect(normalizeLocale('fr-FR')).toBe('zh-CN');
  });
});
