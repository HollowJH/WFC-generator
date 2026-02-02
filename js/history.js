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
            removed: [] // Stores {index, tile}
        };
        this.stack.push(this.currentFrame);
    }

    onOptionRemoved(index, tile) {
        if (this.currentFrame) {
            this.currentFrame.removed.push({ index, tile });
        }
    }

    undo() {
        if (this.stack.length === 0) return null;
        const frame = this.stack.pop();

        // 1. Restore removed options (reverse order)
        for (let i = frame.removed.length - 1; i >= 0; i--) {
            const { index, tile } = frame.removed[i];
            this.model.grid[index].options.push(tile);
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
