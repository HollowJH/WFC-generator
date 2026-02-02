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
            const { gridDim, weights, strategy, useHeuristic } = payload;
            initTiles(weights);
            model = new WFCModel(gridDim, allTiles, strategy || "snapshot", useHeuristic);
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
    if (cell.collapsed) return;

    // Check if the tile is actually a valid option
    // We strictly match by ID or reference. tile comes from allTiles,
    // but cell.options contain references to the same objects (hopefully).
    const choice = cell.options.find(t => t.name === tile.name && t.rotation === tile.rotation);

    if (!choice) {
        console.warn("Attempted to collapse to invalid tile", tile);
        return;
    }

    // 1. Save state
    model.strategy.save(index, choice);

    // 2. Collapse
    cell.collapsed = true;

    // 3. Remove all other options
    // We identify them first to avoid modification issues during iteration
    const toRemove = [];
    for (let i = 0; i < cell.options.length; i++) {
        if (cell.options[i] !== choice) {
            toRemove.push(cell.options[i]);
        }
    }

    // Remove them using the model's method to trigger AC-4 propagation hooks
    for (const t of toRemove) {
        model.removeOption(index, t);
    }

    // 4. Propagate
    const success = model.propagate();

    if (!success) {
        model.backtrack();
    }
    sendUpdate(true);
}

function sendUpdate(changed = true) {
    // We send a serialized version of the grid
    self.postMessage({
        type: 'UPDATE',
        payload: {
            grid: model.grid,
            status: model.status,
            changed: changed,
            stackDepth: model.strategy ? model.strategy.depth : 0,
            remaining: model.grid.filter(c => !c.collapsed).length
        }
    });
}
