import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  batchMatch,
  CharType,
  Interpolation,
  OutputFormat,
  PresetCharset
} = require('../dist/index.cjs.js');

function block(matrix) {
  return {
    matrix: new Float32Array(matrix),
    sourceX: 0,
    sourceY: 0
  };
}

function createSamplingArray(rows, cols, matrixSize) {
  const sampling = [];
  const length = matrixSize * matrixSize;

  for (let row = 0; row < rows; row++) {
    const line = [];
    for (let col = 0; col < cols; col++) {
      const values = new Array(length);
      for (let i = 0; i < length; i++) {
        values[i] = ((row + col + i) % 17) / 16;
      }
      line.push(block(values));
    }
    sampling.push(line);
  }

  return sampling;
}

function createChars(matrixSize) {
  const chars = ' .:-=+*#%@';
  const map = new Map();
  const length = matrixSize * matrixSize;

  for (let index = 0; index < chars.length; index++) {
    map.set(chars[index], {
      char: chars[index],
      matrix: new Float32Array(length).fill(index / (chars.length - 1)),
      type: CharType.NORMAL,
      width: matrixSize,
      height: matrixSize
    });
  }

  return map;
}

async function main() {
  const rows = 50;
  const cols = 100;
  const matrixSize = 6;
  const samplingArray = createSamplingArray(rows, cols, matrixSize);
  const charData = createChars(matrixSize);
  const config = {
    height: rows,
    width: cols,
    matrixSize,
    ratio: 2,
    interpolation: Interpolation.BILINEAR,
    charset: { type: PresetCharset.ASCII },
    invert: false,
    outputFormat: OutputFormat.PLAIN_TEXT,
    trimTrailingSpaces: false,
    wideCharRatio: 1.5,
    enableEarlyTermination: true,
    maxParallelTasks: 0
  };

  const start = performance.now();
  const result = await batchMatch(samplingArray, charData, config);
  const duration = performance.now() - start;

  console.log(JSON.stringify({
    scenario: 'batchMatch 50x100 blocks, 10 ASCII chars, matrixSize=6',
    rows: result.length,
    cols: result[0]?.length ?? 0,
    durationMs: Number(duration.toFixed(2)),
    targetMs: 500,
    passedTarget: duration < 500
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
