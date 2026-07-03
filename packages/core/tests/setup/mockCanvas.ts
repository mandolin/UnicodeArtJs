type MockCanvasState = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  fillStyle: string;
};

function colorFromFillStyle(fillStyle: string): [number, number, number, number] {
  return fillStyle === '#000000' ? [0, 0, 0, 255] : [255, 255, 255, 255];
}

function setPixel(state: MockCanvasState, x: number, y: number, color: [number, number, number, number]): void {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
    return;
  }

  const index = (y * state.width + x) * 4;
  state.data[index] = color[0];
  state.data[index + 1] = color[1];
  state.data[index + 2] = color[2];
  state.data[index + 3] = color[3];
}

function fillRect(
  state: MockCanvasState,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const color = colorFromFillStyle(state.fillStyle);

  for (let row = Math.max(0, Math.floor(y)); row < Math.min(state.height, Math.ceil(y + height)); row++) {
    for (let col = Math.max(0, Math.floor(x)); col < Math.min(state.width, Math.ceil(x + width)); col++) {
      setPixel(state, col, row, color);
    }
  }
}

function fillText(state: MockCanvasState, text: string): void {
  const color = colorFromFillStyle(state.fillStyle);
  const seed = Array.from(text).reduce((sum, char) => sum + char.codePointAt(0)!, 0);
  const glyphWidth = Math.max(1, Math.min(state.width, Math.ceil(state.width * 0.7)));
  const glyphHeight = Math.max(1, Math.min(state.height, Math.ceil(state.height * 0.7)));
  const offsetX = Math.max(0, Math.floor((state.width - glyphWidth) / 2));
  const offsetY = Math.max(0, Math.floor((state.height - glyphHeight) / 2));

  for (let row = 0; row < glyphHeight; row++) {
    for (let col = 0; col < glyphWidth; col++) {
      if (((row + col + seed) % 3) !== 0) {
        setPixel(state, offsetX + col, offsetY + row, color);
      }
    }
  }
}

jest.mock(
  'canvas',
  () => ({
    createCanvas: jest.fn((width: number, height: number) => {
      const state: MockCanvasState = {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
        fillStyle: '#000000'
      };

      const context = {
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        get fillStyle(): string {
          return state.fillStyle;
        },
        set fillStyle(value: string) {
          state.fillStyle = value;
        },
        fillRect: jest.fn((x: number, y: number, rectWidth: number, rectHeight: number) => {
          fillRect(state, x, y, rectWidth, rectHeight);
        }),
        fillText: jest.fn((text: string) => {
          fillText(state, text);
        }),
        measureText: jest.fn((text: string) => ({
          width: Math.max(1, Array.from(text).length) * Math.max(1, Math.ceil(state.height * 0.6))
        })),
        getImageData: jest.fn(() => ({
          data: state.data
        }))
      };

      return {
        width,
        height,
        getContext: jest.fn(() => context)
      };
    }),
    registerFont: jest.fn()
  }),
  { virtual: true }
);
