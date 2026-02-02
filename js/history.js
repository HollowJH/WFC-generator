export class HistoryStrategy {
    constructor(model) {
        this.model = model;
        this.stack = [];
    }
    save(cellIndex, choice) { throw new Error("Not implemented"); }
    undo() { throw new Error("Not implemented"); }
    clear() { this.stack = []; }
    get depth() { return this.stack.length; }
}

export class SnapshotStrategy extends HistoryStrategy {
    save(cellIndex, choice) {
        this.stack.push({
            grid: this.model.cloneGrid(),
            cellIndex: cellIndex,
            choice: choice
        });
    }

    undo() {
        if (this.stack.length === 0) return null;
        const lastState = this.stack.pop();
        this.model.grid = lastState.grid;

        // Rebuild heap since grid was fully replaced
        this.model.rebuildHeap();

        // AC-4: Rebuild supports since grid changed
        // This is expensive but necessary for snapshot strategy
        this.model.initSupports();

        return lastState; // Return { cellIndex, choice } for banning
    }
}

export class DeltaStrategy extends HistoryStrategy {
    constructor(model) {
        super(model);
        this.currentFrame = null;
    }

    save(cellIndex, choice) {
        this.currentFrame = {
            cellIndex: cellIndex,
            choice: choice,
            removed: [] // Flat array: [index1, tile1, index2, tile2...]
        };
        this.stack.push(this.currentFrame);
    }

    onOptionRemoved(index, tile) {
        if (this.currentFrame) {
            this.currentFrame.removed.push(index);
            this.currentFrame.removed.push(tile);
        }
    }

    undo() {
        if (this.stack.length === 0) return null;
        const frame = this.stack.pop();

        // 1. Restore removed options (reverse order)
        // Since it's a flat array [i1, t1, i2, t2], we iterate by 2 backwards
        for (let i = frame.removed.length - 2; i >= 0; i -= 2) {
            const index = frame.removed[i];
            const tile = frame.removed[i + 1];

            this.model.grid[index].options.push(tile);

            // AC-4: Increment supports for restored tile
            this.model.restoreOption(index, tile);
        }

        // 2. Un-collapse
        this.model.grid[frame.cellIndex].collapsed = false;

        // 3. Set current frame to previous (if any) so future removes go there
        this.currentFrame = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;

        // 4. Rebuild heap (needed because entropies changed)
        this.model.rebuildHeap();

        return frame;
    }

    clear() {
        super.clear();
        this.currentFrame = null;
    }
}
