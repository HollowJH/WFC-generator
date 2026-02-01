import { Tile } from './tile.js';

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

        this.initialize();
    }

    initialize() {
        this.grid = [];
        for (let i = 0; i < this.size * this.size; i++) {
            this.grid.push(new Cell(this.tiles));
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
        let minEntropy = Infinity;
        let candidates = [];

        for (let i = 0; i < this.grid.length; i++) {
            const cell = this.grid[i];
            if (!cell.collapsed) {
                if (cell.options.length === 0) {
                    return -2; // Contradiction
                }

                const entropy = cell.entropy();
                // Add small noise to avoid grid artifacts
                const noise = Math.random() * 0.0001;
                const weightedEntropy = entropy + noise;

                if (weightedEntropy < minEntropy) {
                    minEntropy = weightedEntropy;
                    candidates = [i];
                } else if (Math.abs(weightedEntropy - minEntropy) < 0.00001) {
                    candidates.push(i);
                }
            }
        }

        if (candidates.length === 0) return -1; // All collapsed

        // Pick random candidate from best
        return candidates[Math.floor(Math.random() * candidates.length)];
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
                    }
                }
            }
        }
        return true;
    }
}
