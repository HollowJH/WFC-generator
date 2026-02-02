import { WFCModel } from './wfc.js';
import { createSimpleTiles } from './tile.js';

let model = null;
let allTiles = [];

function initTiles(weights) {
    const baseTiles = createSimpleTiles(weights);
    allTiles = [];

    // Generate rotations
    baseTiles.forEach(t => {
        allTiles.push(t);
        for (let i = 1; i <= 3; i++) {
            const rot = t.rotate(i);
            const isDuplicate = allTiles.some(existing =>
                existing.sockets[0] === rot.sockets[0] &&
                existing.sockets[1] === rot.sockets[1] &&
                existing.sockets[2] === rot.sockets[2] &&
                existing.sockets[3] === rot.sockets[3]
            );

            if (!isDuplicate) {
                allTiles.push(rot);
            }
        }
    });
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            const { gridDim, weights } = payload;
            initTiles(weights);
            model = new WFCModel(gridDim, allTiles);
            sendUpdate();
            break;

        case 'STEP':
            if (!model) return;
            const count = payload && payload.count ? payload.count : 1;
            let lastChanged = false;
            for (let i = 0; i < count; i++) {
                const stepResult = model.step();
                if (stepResult) lastChanged = true;
                if (model.status === "COMPLETED" || model.status === "FAILED") break;
            }
            sendUpdate(lastChanged);
            break;

        case 'RUN_UNTIL_DONE':
            if (!model) return;
            while (model.status !== "COMPLETED" && model.status !== "FAILED") {
                model.step();
            }
            sendUpdate(true);
            break;

        case 'COLLAPSE':
            if (!model) return;
            const { index, tileName, rotation } = payload;
            // Find the tile in allTiles
            const targetTile = allTiles.find(t => t.name === tileName && t.rotation === rotation);
            if (targetTile) {
                collapseCell(index, targetTile);
            }
            break;
    }
};

function collapseCell(index, tile) {
    const cell = model.grid[index];
    model.stack.push({
        grid: model.cloneGrid(),
        cellIndex: index,
        choice: tile
    });

    cell.collapsed = true;
    cell.options = [tile];

    model.propStack.push(index);
    const success = model.propagate();

    if (!success) {
        model.backtrack();
    }
    sendUpdate(true);
}

function sendUpdate(changed = true) {
    // We send a serialized version of the grid
    // structuredClone handles the objects, but we might want to be explicit
    // to avoid sending too much data if Tile objects are heavy.
    // However, Tile objects are now light.
    self.postMessage({
        type: 'UPDATE',
        payload: {
            grid: model.grid,
            status: model.status,
            changed: changed,
            stackDepth: model.stack ? model.stack.length : 0,
            remaining: model.grid.filter(c => !c.collapsed).length
        }
    });
}
