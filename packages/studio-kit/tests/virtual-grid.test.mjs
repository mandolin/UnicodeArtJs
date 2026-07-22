import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  VIRTUAL_GRID_PROJECTION_SCHEMA,
  VIRTUAL_GRID_SESSION_PATCH_SCHEMA,
  createVirtualGridProjection,
  createVirtualGridSessionPatch,
  hitTestVirtualGrid,
  normalizeVirtualGridViewport,
} from '../src/index.js';
import {
  createVirtualGridProjection as createWebVirtualGridProjection,
  hitTestVirtualGrid as hitTestWebVirtualGrid,
} from '../../web/src/studio/virtual-grid.js';

function createTestCellMap(width, height) {
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push({
        x,
        y,
        char: String.fromCharCode(65 + ((x + y) % 26)),
        width: 1,
        role: 'glyph',
        sourceGlyph: null,
      });
    }
  }
  return {
    schema: 'unicodeartjs-cell-map@0',
    width,
    height,
    cells,
  };
}

describe('Studio Kit Virtual Grid', () => {
  it('normalizes viewport and returns a non-source projection', () => {
    const cellMap = createTestCellMap(12, 8);
    const projection = createVirtualGridProjection(cellMap, {
      x: 10,
      y: 6,
      cols: 4,
      rows: 3,
      overscanCols: 1,
      overscanRows: 1,
    });

    assert.equal(projection.schema, VIRTUAL_GRID_PROJECTION_SCHEMA);
    assert.equal(projection.rendererIsSourceModel, false);
    assert.deepEqual(projection.viewport, {
      x: 8,
      y: 5,
      cols: 4,
      rows: 3,
      zoom: 1,
      overscanCols: 1,
      overscanRows: 1,
    });
    assert.deepEqual(projection.visibleRect, {
      x: 7,
      y: 4,
      width: 5,
      height: 4,
    });
  });

  it('keeps visible cells detached from the source CellMap', () => {
    const cellMap = createTestCellMap(8, 4);
    const projection = createVirtualGridProjection(cellMap, { x: 2, y: 1, cols: 3, rows: 2 });

    projection.cells[0].char = '#';

    assert.equal(cellMap.cells.find((cell) => cell.x === 2 && cell.y === 1).char, 'D');
  });

  it('maps hit test coordinates back to CellMap coordinates', () => {
    const projection = createVirtualGridProjection(createTestCellMap(12, 8), { x: 4, y: 2, cols: 4, rows: 3 });

    const hit = hitTestVirtualGrid(projection, {
      originX: 10,
      originY: 20,
      clientX: 25,
      clientY: 36,
      cellWidth: 5,
      cellHeight: 8,
    });

    assert.deepEqual({ hit: hit.hit, x: hit.x, y: hit.y, char: hit.cell.char }, {
      hit: true,
      x: 7,
      y: 4,
      char: 'L',
    });
    assert.deepEqual(hitTestVirtualGrid(projection, { clientX: -1, clientY: 0, cellWidth: 5, cellHeight: 8 }), {
      hit: false,
    });
  });

  it('creates editor session patch without host-owned state', () => {
    const projection = createVirtualGridProjection(createTestCellMap(16, 8), { x: 1, y: 2, cols: 5, rows: 3 });
    const patch = createVirtualGridSessionPatch(projection);

    assert.equal(patch.schema, VIRTUAL_GRID_SESSION_PATCH_SCHEMA);
    assert.equal(patch.renderer.kind, 'virtual-grid');
    assert.equal(patch.renderer.rendererIsSourceModel, false);
    assert.equal(patch.renderer.metrics.visibleCells, 15);
    assert.ok(!Object.hasOwn(patch, 'canvas'));
    assert.ok(!Object.hasOwn(patch, 'document'));
  });

  it('stays behavior-compatible with the Web staging module for the first wave', () => {
    const cellMap = createTestCellMap(10, 6);
    const viewport = { x: 3, y: 2, cols: 4, rows: 2, overscanCols: 1, overscanRows: 1 };
    const studioKitProjection = createVirtualGridProjection(cellMap, viewport);
    const webProjection = createWebVirtualGridProjection(cellMap, viewport);

    assert.deepEqual(studioKitProjection, webProjection);
    assert.deepEqual(
      hitTestVirtualGrid(studioKitProjection, { clientX: 3, clientY: 2, cellWidth: 1, cellHeight: 1 }),
      hitTestWebVirtualGrid(webProjection, { clientX: 3, clientY: 2, cellWidth: 1, cellHeight: 1 }),
    );
    assert.deepEqual(normalizeVirtualGridViewport(cellMap, viewport), {
      ...webProjection.viewport,
      visibleRect: webProjection.visibleRect,
    });
  });
});
