import { Tile } from './tile.js';

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
    constructor(size, tiles) {
        this.size = size;
        this.tiles = tiles; // All possible tiles
        this.grid = [];
        this.propStack = []; // For propagation
        this.stack = [];     // For backtracking history
        this.status = "READY"; // READY, RUNNING, COMPLETED, FAILED
        this.heap = new MinHeap();

        this.initialize();
    }

    initialize() {
        this.grid = [];
        this.heap = new MinHeap();
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = new Cell(this.tiles);
            this.grid.push(cell);
            this.heap.push({
                index: i,
                entropy: cell.entropy() + Math.random() * 0.0001,
                optionsCount: cell.options.length
            });
        }
        this.propStack = [];
        this.stack = [];
        this.status = "READY";
    }

    cloneGrid() {
        return this.grid.map(cell => {
            const cloned = new Cell(cell.options);
            cloned.collapsed = cell.collapsed;
            return cloned;
        });
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
        // We store the grid state and what we are about to try
        this.stack.push({
            grid: this.cloneGrid(),
            cellIndex: cellIndex,
            choice: choice
        });

        cell.collapsed = true;
        cell.options = [choice];

        // 4. Propagate constraints
        this.propStack.push(cellIndex);
        if (!this.propagate()) {
            return this.backtrack();
        }

        return true;
    }

    backtrack() {
        if (this.stack.length === 0) {
            this.status = "FAILED";
            return false;
        }

        const lastState = this.stack.pop();
        this.grid = lastState.grid;

        const cell = this.grid[lastState.cellIndex];
        // Remove the option that failed
        cell.options = cell.options.filter(o => o !== lastState.choice);

        // Rebuild heap because grid state was restored
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

        if (cell.options.length === 0) {
            // This state itself is now invalid, backtrack further
            return this.backtrack();
        }

        // Re-propagate from this cell since we removed an option from it
        // This is necessary because the grid we restored might have been
        // partially propagated before the failed choice.
        // Actually, lastState.grid is the state BEFORE we collapsed cellIndex.
        // So we just need to re-propagate to ensure the removal of 'choice'
        // from 'cell.options' is felt by neighbors.
        this.propStack.push(lastState.cellIndex);
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

            // Stale check: if the number of options in the heap doesn't match the current number of options
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
            const currentIdx = this.propStack.pop();
            const curCell = this.grid[currentIdx];
            const curX = currentIdx % this.size;
            const curY = Math.floor(currentIdx / this.size);

            // Directions: 0:N, 1:E, 2:S, 3:W
            const dirs = [
                { dx: 0, dy: -1, opp: 2, socketIdx: 0 }, // North (connects to neighbor's South)
                { dx: 1, dy: 0, opp: 3, socketIdx: 1 },  // East  (connects to neighbor's West)
                { dx: 0, dy: 1, opp: 0, socketIdx: 2 },  // South (connects to neighbor's North)
                { dx: -1, dy: 0, opp: 1, socketIdx: 3 }  // West  (connects to neighbor's East)
            ];

            for (let d of dirs) {
                const nx = curX + d.dx;
                const ny = curY + d.dy;

                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    const neighborIdx = ny * this.size + nx;
                    const neighbor = this.grid[neighborIdx];

                    // Calculate valid options for neighbor based on current cell's remaining options
                    const validSockets = new Set();
                    for (let tile of curCell.options) {
                        validSockets.add(tile.sockets[d.socketIdx]);
                    }

                    // Filter neighbor options
                    const originalCount = neighbor.options.length;
                    neighbor.options = neighbor.options.filter(neighborTile => {
                        const neighborSocket = neighborTile.sockets[d.opp];
                        return validSockets.has(neighborSocket);
                    });

                    if (neighbor.options.length === 0) {
                        this.propStack = []; // Clear stack on failure
                        return false; // Contradiction found
                    }

                    if (neighbor.options.length < originalCount) {
                        this.propStack.push(neighborIdx);
                        this.heap.push({
                            index: neighborIdx,
                            entropy: neighbor.entropy() + Math.random() * 0.0001,
                            optionsCount: neighbor.options.length
                        });
                    }
                }
            }
        }
        return true;
    }
}
