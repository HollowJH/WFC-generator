import { Tile } from './tile.js';
import { SnapshotStrategy, DeltaStrategy } from './history.js';

class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(node) {
        this.heap.push(node);
        this.bubbleUp();
    }

    pop() {
        if (this.size === 0) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.size > 0) {
            this.heap[0] = last;
            this.sinkDown();
        }
        return min;
    }

    get size() {
        return this.heap.length;
    }

    bubbleUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex].entropy <= this.heap[index].entropy) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    sinkDown() {
        let index = 0;
        const length = this.heap.length;
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let swap = null;

            if (leftChildIndex < length) {
                if (this.heap[leftChildIndex].entropy < this.heap[index].entropy) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                if (
                    (swap === null && this.heap[rightChildIndex].entropy < this.heap[index].entropy) ||
                    (swap !== null && this.heap[rightChildIndex].entropy < this.heap[leftChildIndex].entropy)
                ) {
                    if (this.heap[rightChildIndex].entropy < this.heap[leftChildIndex].entropy) {
                        swap = rightChildIndex;
                    }
                }
            }

            if (swap === null) break;
            [this.heap[index], this.heap[swap]] = [this.heap[swap], this.heap[index]];
            index = swap;
        }
    }
}

export class Cell {
    constructor(options) {
        this.collapsed = false;
        this.options = [...options]; // Copy of all possible tiles
    }

    entropy() {
        if (this.collapsed) return 0;

        let sumWeights = 0;
        let sumWeightLogWeight = 0;

        for (const tile of this.options) {
            sumWeights += tile.weight;
            sumWeightLogWeight += tile.weight * Math.log(tile.weight);
        }

        // Shannon entropy: H = log(sum_weights) - (sum(w * log(w)) / sum_weights)
        if (sumWeights === 0) return 0;
        return Math.log(sumWeights) - (sumWeightLogWeight / sumWeights);
    }
}

export class WFCModel {
    constructor(size, tiles, strategy = "snapshot") {
        this.size = size;
        this.tiles = tiles; // All possible tiles
        this.grid = [];
        this.propStack = []; // For propagation

        // AC-4: Assign IDs to tiles for array indexing
        this.tiles.forEach((t, i) => t.id = i);
        this.numTiles = tiles.length;

        // AC-4: Pre-calculate propagator
        // propagator[tileId][dir] = [compatibleTileIds]
        // Directions: 0:N, 1:E, 2:S, 3:W
        this.propagator = new Array(this.numTiles).fill(0).map(() => new Array(4).fill(0).map(() => []));
        this.buildPropagator();

        if (strategy === "delta") {
            this.strategy = new DeltaStrategy(this);
        } else {
            this.strategy = new SnapshotStrategy(this);
        }

        this.status = "READY"; // READY, RUNNING, COMPLETED, FAILED
        this.heap = new MinHeap();

        this.initialize();
    }

    buildPropagator() {
        const dirs = [
            { dx: 0, dy: -1, opp: 2, socketIdx: 0 }, // North
            { dx: 1, dy: 0, opp: 3, socketIdx: 1 },  // East
            { dx: 0, dy: 1, opp: 0, socketIdx: 2 },  // South
            { dx: -1, dy: 0, opp: 1, socketIdx: 3 }  // West
        ];

        for (let t1 of this.tiles) {
            for (let d = 0; d < 4; d++) {
                const dir = dirs[d];
                for (let t2 of this.tiles) {
                    // Check compatibility
                    // Rule: t1's socket at dir must match t2's socket at opp
                    if (t1.sockets[dir.socketIdx] === t2.sockets[dir.opp]) {
                        this.propagator[t1.id][d].push(t2.id);
                    }
                }
            }
        }
    }

    initialize() {
        this.grid = [];
        this.heap = new MinHeap();

        // AC-4: Initialize supports
        // Flattened 3D array: [cellIndex][tileId][dir]
        // Size: gridLength * numTiles * 4
        this.supports = new Int32Array(this.size * this.size * this.numTiles * 4);

        for (let i = 0; i < this.size * this.size; i++) {
            const cell = new Cell(this.tiles);
            this.grid.push(cell);
            this.heap.push({
                index: i,
                entropy: cell.entropy() + Math.random() * 0.0001,
                optionsCount: cell.options.length
            });
        }

        this.initSupports();

        this.propStack = [];
        this.strategy.clear();
        this.status = "READY";
    }

    initSupports() {
        // Re-calculate all supports based on current grid state
        const dirs = [
            { dx: 0, dy: -1 }, // N
            { dx: 1, dy: 0 },  // E
            { dx: 0, dy: 1 },  // S
            { dx: -1, dy: 0 }  // W
        ];

        for (let i = 0; i < this.size * this.size; i++) {
            const curX = i % this.size;
            const curY = Math.floor(i / this.size);

            for (let t = 0; t < this.numTiles; t++) {
                for (let d = 0; d < 4; d++) {
                    const nx = curX + dirs[d].dx;
                    const ny = curY + dirs[d].dy;

                    if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                        const neighborIdx = ny * this.size + nx;
                        const neighbor = this.grid[neighborIdx];

                        // Count how many options in neighbor are compatible with tile t in direction d
                        let count = 0;
                        const compatibles = this.propagator[t][d]; // Array of tile IDs

                        // We need to check intersection of neighbor.options and compatibles
                        // Since neighbor.options is array of Tile objects, we iterate
                        // Optimization: For AC-4, we just need the count.
                        // With naive init, we assume all options present.
                        // But initSupports might be called during restore, so check actual options.

                        // Fast check using Set or just iterating if small
                        // For init, we can iterate neighbor options
                        for (let opt of neighbor.options) {
                            // Is opt.id in compatibles?
                            // Propagator lists compatible IDs.
                            // If tileset is small, includes check is fast.
                            // For larger, a Set or boolean lookup table for propagator is better.
                            // But propagator is dense.
                            if (compatibles.includes(opt.id)) {
                                count++;
                            }
                        }
                        this.setSupport(i, t, d, count);
                    } else {
                        // Boundary: Infinite support so it never hits 0
                        this.setSupport(i, t, d, 1);
                    }
                }
            }
        }
    }

    // Helper to access supports array
    getSupport(cellIdx, tileId, dir) {
        return this.supports[(cellIdx * this.numTiles * 4) + (tileId * 4) + dir];
    }

    setSupport(cellIdx, tileId, dir, val) {
        this.supports[(cellIdx * this.numTiles * 4) + (tileId * 4) + dir] = val;
    }

    decSupport(cellIdx, tileId, dir) {
        const idx = (cellIdx * this.numTiles * 4) + (tileId * 4) + dir;
        this.supports[idx]--;
        return this.supports[idx];
    }

    incSupport(cellIdx, tileId, dir) {
        const idx = (cellIdx * this.numTiles * 4) + (tileId * 4) + dir;
        this.supports[idx]++;
        return this.supports[idx];
    }

    cloneGrid() {
        return this.grid.map(cell => {
            const cloned = new Cell(cell.options);
            cloned.collapsed = cell.collapsed;
            return cloned;
        });
    }

    rebuildHeap() {
        this.heap = new MinHeap();
        for (let i = 0; i < this.grid.length; i++) {
            if (!this.grid[i].collapsed) {
                this.heap.push({
                    index: i,
                    entropy: this.grid[i].entropy() + Math.random() * 0.0001,
                    optionsCount: this.grid[i].options.length
                });
            }
        }
    }

    // Helper to remove an option and track it via strategy
    removeOption(index, tile) {
        const cell = this.grid[index];
        // Check if already removed (optimization)
        if (!cell.options.includes(tile)) return;

        const prevLen = cell.options.length;
        cell.options = cell.options.filter(o => o !== tile);

        if (cell.options.length < prevLen) {
            // Notify strategy (for Delta undo)
            if (this.strategy.onOptionRemoved) {
                this.strategy.onOptionRemoved(index, tile);
            }

            // AC-4: Add to propagation stack
            this.propStack.push({ index, tile });
        }
    }

    // Hook called by DeltaStrategy during undo
    restoreOption(index, tile) {
        // AC-4: When a tile is restored at 'index', we must INCREMENT the support counts
        // for all compatible neighbors. This is the inverse of propagation.

        const curX = index % this.size;
        const curY = Math.floor(index / this.size);

        // Directions: 0:N, 1:E, 2:S, 3:W
        const dirs = [
            { dx: 0, dy: -1, opp: 2 }, // North
            { dx: 1, dy: 0, opp: 3 },  // East
            { dx: 0, dy: 1, opp: 0 },  // South
            { dx: -1, dy: 0, opp: 1 }  // West
        ];

        for (let d = 0; d < 4; d++) {
            const nx = curX + dirs[d].dx;
            const ny = curY + dirs[d].dy;

            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                const neighborIdx = ny * this.size + nx;

                // Which tiles in neighbor are compatible with the restored tile?
                // Note: propagator[T][d] gives list of T' in neighbor (at d) compatible with T (at current)
                const compatibleNeighbors = this.propagator[tile.id][d];

                for (let otherTileId of compatibleNeighbors) {
                    // We increment support for (neighbor, otherTile, OPP_DIR)
                    // The support for 'otherTile' at neighbor depends on 'tile' at current (which is at OPP_DIR relative to neighbor)
                    this.incSupport(neighborIdx, otherTileId, dirs[d].opp);
                }
            }
        }
    }

    // Main iteration step
    step() {
        if (this.status === "COMPLETED" || this.status === "FAILED") return false;
        this.status = "RUNNING";

        // 1. Find cell with lowest entropy
        const cellIndex = this.getLowestEntropyIndex();

        // If contradiction found (-2)
        if (cellIndex === -2) {
            return this.backtrack();
        }

        // If no cell found (-1), we are done!
        if (cellIndex === -1) {
            this.status = "COMPLETED";
            return false;
        }

        // 2. Collapse that cell
        const cell = this.grid[cellIndex];
        const choiceIndex = this.pickWeightedOption(cell.options);
        const choice = cell.options[choiceIndex];

        // 3. Save state for backtracking BEFORE change
        this.strategy.save(cellIndex, choice);

        cell.collapsed = true;

        // AC-4: Remove all other options
        const toRemove = cell.options.filter(o => o !== choice);
        for (const t of toRemove) {
            this.removeOption(cellIndex, t);
        }

        // 4. Propagate constraints
        // Note: removeOption already pushed to propStack
        if (!this.propagate()) {
            return this.backtrack();
        }

        return true;
    }

    backtrack() {
        const lastState = this.strategy.undo();

        if (!lastState) {
            this.status = "FAILED";
            return false;
        }

        const cell = this.grid[lastState.cellIndex];

        // Remove the option that failed
        this.removeOption(lastState.cellIndex, lastState.choice);

        if (cell.options.length === 0) {
            return this.backtrack();
        }

        if (!this.propagate()) {
            return this.backtrack();
        }

        return true;
    }

    getLowestEntropyIndex() {
        while (this.heap.size > 0) {
            const node = this.heap.pop();
            const cell = this.grid[node.index];

            if (cell.collapsed) continue;

            if (cell.options.length === 0) {
                return -2; // Contradiction
            }

            // Stale check
            if (node.optionsCount !== cell.options.length) {
                continue;
            }

            return node.index;
        }

        return -1; // All collapsed
    }

    pickWeightedOption(options) {
        const sumWeights = options.reduce((sum, tile) => sum + tile.weight, 0);
        let r = Math.random() * sumWeights;
        for (let i = 0; i < options.length; i++) {
            r -= options[i].weight;
            if (r <= 0) return i;
        }
        return options.length - 1;
    }

    propagate() {
        while (this.propStack.length > 0) {
            const { index: currentIdx, tile: removedTile } = this.propStack.pop();
            const curX = currentIdx % this.size;
            const curY = Math.floor(currentIdx / this.size);

            // Directions: 0:N, 1:E, 2:S, 3:W
            const dirs = [
                { dx: 0, dy: -1, opp: 2 }, // North (0) -> Neighbor is N, I am S relative to neighbor (opp=2)
                { dx: 1, dy: 0, opp: 3 },  // East (1)
                { dx: 0, dy: 1, opp: 0 },  // South (2)
                { dx: -1, dy: 0, opp: 1 }  // West (3)
            ];

            for (let d = 0; d < 4; d++) {
                const nx = curX + dirs[d].dx;
                const ny = curY + dirs[d].dy;

                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    const neighborIdx = ny * this.size + nx;
                    const neighbor = this.grid[neighborIdx];

                    // Optimization: If neighbor is collapsed, we don't need to propagate?
                    // No, because removed options might still affect consistency?
                    // Actually if neighbor is collapsed, it has only 1 option.
                    // If that option relied on the removed tile, it would be a contradiction.
                    // The support logic handles this naturally.

                    // Which tiles in neighbor are compatible with removedTile in direction d?
                    // Wait. Logic is: "Removed T from Cell".
                    // Neighbor had 'support' from T.
                    // For every tile T' in Neighbor that was compatible with T (in direction OPP),
                    // we decrement support(Neighbor, T', OPP).

                    // Note: 'compatible' means T (at Current) and T' (at Neighbor) are valid.
                    // propagator[T.id][d] gives list of T' at Neighbor.
                    const compatibleNeighbors = this.propagator[removedTile.id][d];

                    for (let otherTileId of compatibleNeighbors) {
                        const newSupport = this.decSupport(neighborIdx, otherTileId, dirs[d].opp);

                        if (newSupport === 0) {
                            // Find the tile object
                            // Optimization: Store map or access by ID if possible.
                            // But cell.options is small array.
                            const tileToRemove = neighbor.options.find(t => t.id === otherTileId);
                            if (tileToRemove) {
                                const originalCount = neighbor.options.length;
                                this.removeOption(neighborIdx, tileToRemove);

                                if (neighbor.options.length === 0) {
                                    this.propStack = []; // Fail fast
                                    return false;
                                }

                                // Update heap if entropy changed
                                // We can just push to heap, lazy deletion handles duplicates
                                if (neighbor.options.length < originalCount) {
                                    this.heap.push({
                                        index: neighborIdx,
                                        entropy: neighbor.entropy() + Math.random() * 0.0001,
                                        optionsCount: neighbor.options.length
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
}
