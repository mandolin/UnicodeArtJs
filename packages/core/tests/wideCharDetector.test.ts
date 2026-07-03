import { isWideChar, detectWideCharsInText, calculateDisplayWidth } from '../src/utils/wideCharDetector';

describe('wideCharDetector', () => {
  describe('isWideChar', () => {
    test('detects Chinese characters as wide', () => {
      expect(isWideChar('中')).toBe(true);
      expect(isWideChar('文')).toBe(true);
      expect(isWideChar('测')).toBe(true);
    });

    test('detects Japanese hiragana as wide', () => {
      expect(isWideChar('あ')).toBe(true);
      expect(isWideChar('い')).toBe(true);
      expect(isWideChar('う')).toBe(true);
    });

    test('detects Japanese katakana as wide', () => {
      expect(isWideChar('ア')).toBe(true);
      expect(isWideChar('イ')).toBe(true);
      expect(isWideChar('ウ')).toBe(true);
    });

    test('matches Python reference behavior for Korean characters', () => {
      expect(isWideChar('한')).toBe(false);
      expect(isWideChar('글')).toBe(false);
    });

    test('detects ASCII characters as normal width', () => {
      expect(isWideChar('A')).toBe(false);
      expect(isWideChar('a')).toBe(false);
      expect(isWideChar('0')).toBe(false);
      expect(isWideChar(' ')).toBe(false);
    });

    test('detects common punctuation as normal width', () => {
      expect(isWideChar('.')).toBe(false);
      expect(isWideChar(',')).toBe(false);
      expect(isWideChar('!')).toBe(false);
    });
  });

  describe('detectWideCharsInText', () => {
    test('finds wide character positions', () => {
      const text = 'Hello世界';
      const positions = detectWideCharsInText(text);

      expect(positions).toContain(5); // '世'
      expect(positions).toContain(6); // '界'
      expect(positions.length).toBe(2);
    });

    test('returns empty array for ASCII text', () => {
      const text = 'Hello World';
      const positions = detectWideCharsInText(text);
      expect(positions.length).toBe(0);
    });

    test('handles mixed content', () => {
      const text = 'ABC中文DEF日文';
      const positions = detectWideCharsInText(text);

      expect(positions).toContain(3); // '中' at index 3
      expect(positions).toContain(4); // '文' at index 4
      expect(positions).toContain(8); // '日' at index 8 (A,B,C,中,文,D,E,F = 0-7, then 日 at 8)
      expect(positions).toContain(9); // '文' at index 9
    });
  });

  describe('calculateDisplayWidth', () => {
    test('calculates width for ASCII text', () => {
      expect(calculateDisplayWidth('Hello')).toBe(5);
      expect(calculateDisplayWidth('World')).toBe(5);
    });

    test('calculates width for Chinese text', () => {
      expect(calculateDisplayWidth('中文')).toBe(4); // 2 chars × 2 width
      expect(calculateDisplayWidth('测试')).toBe(4);
    });

    test('calculates width for mixed text', () => {
      expect(calculateDisplayWidth('Hi中文')).toBe(6); // 2 + 4
      expect(calculateDisplayWidth('A中B文C')).toBe(7); // 1+2+1+2+1
    });

    test('handles empty string', () => {
      expect(calculateDisplayWidth('')).toBe(0);
    });
  });
});
