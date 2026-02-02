# WFC Strategy Pattern & Delta Encoding Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a Strategy Pattern for WFC state management, allowing runtime switching between "Snapshot" (Debug/GodMode) and "Delta" (High Performance) modes.

**Architecture:** Refactor `WFCModel` to delegate state management (save/undo) to a `HistoryStrategy` interface. Implement two concrete strategies: `SnapshotStrategy` (current behavior) and `DeltaStrategy` (memory optimized). Add UI controls to toggle between them.

**Tech Stack:** JavaScript (ES6 Modules), Web Workers.

---

### Task 1: Strategy Interface & Snapshot Implementation

**Files:**
- Create: `js/history.js`
- Modify: `js/wfc.js`

**Step 1: Define Strategy Interface & Snapshot Class**
Create `js/history.js` with a base class and the Snapshot implementation.

```javascript
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
            grid: this.model.cloneGrid(), // Requires model.cloneGrid() to be public
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
```

**Step 2: Refactor WFCModel to use Strategy**
Modify `js/wfc.js`:
1. Import `SnapshotStrategy`.
2. Add `strategy` parameter to constructor (default to Snapshot).
3. Replace `this.stack.push(...)` in `step()` with `this.strategy.save(...)`.
4. Replace `this.stack.pop()` logic in `backtrack()` with `this.strategy.undo()`.

**Step 3: Commit**
```bash
git add js/history.js js/wfc.js
git commit -m "refactor: extract history management to Strategy pattern"
```

### Task 2: Delta Strategy Implementation

**Files:**
- Modify: `js/history.js`
- Modify: `js/wfc.js` (Add hooks for option removal)

**Step 1: Implement DeltaStrategy**
In `js/history.js`:

```javascript
export class DeltaStrategy extends HistoryStrategy {
    constructor(model) {
        super(model);
        this.currentFrame = null;
    }

    save(cellIndex, choice) {
        // Start a new frame
        this.currentFrame = {
            cellIndex: cellIndex,
            choice: choice,
            removed: [] // Stores {index, tile}
        };
        this.stack.push(this.currentFrame);
    }

    // Called by Model when an option is removed
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
            // Optimization: We don't strictly need to rebuild heap here if we handle it carefully,
            // but for safety/consistency with Snapshot, we might want to trigger a heap rebuild or update.
            // For Delta, we can just un-collapse the main cell.
        }

        // 2. Un-collapse
        this.model.grid[frame.cellIndex].collapsed = false;

        // 3. Set current frame to previous (if any) so future removes go there
        this.currentFrame = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;

        // 4. Rebuild heap (needed because entropies changed)
        this.model.rebuildHeap();

        return frame;
    }
}
```

**Step 2: Add Hooks to WFCModel**
In `js/wfc.js`:
1. Add `removeOption(index, tile)` method.
2. Update `propagate` and `step` to call `removeOption` instead of direct filtering.
3. In `removeOption`, call `this.strategy.onOptionRemoved(index, tile)` (if method exists).

**Step 3: Commit**
```bash
git add js/history.js js/wfc.js
git commit -m "feat: implement DeltaStrategy for memory optimization"
```

### Task 3: Worker & UI Integration

**Files:**
- Modify: `js/worker.js`
- Modify: `js/main.js`
- Modify: `index.html`

**Step 1: Update Worker to handle Mode Switch**
In `js/worker.js`:
- Handle `INIT` payload having a `strategy` field ("snapshot" or "delta").
- Instantiate `WFCModel` with the correct strategy class.

**Step 2: Add UI Toggle**
In `index.html`:
- Add a dropdown `<select id="strategySelect">` with options "Debug (Snapshot)" and "Fast (Delta)".
- Update `dimInput` max value logic:
    - If "Debug": Max 100
    - If "Fast": Max 200 (or 500)

**Step 3: Wire up Events in Main**
In `js/main.js`:
- Pass `strategy` value in `INIT` message.
- Listen for `strategySelect` change -> Trigger Reset.
- Update `dimInput` validation based on selected strategy.

**Step 4: Commit**
```bash
git add js/worker.js js/main.js index.html
git commit -m "feat: add UI to switch between Debug and Performance modes"
```

### Task 4: Documentation Update

**Files:**
- Modify: `README.md`

**Step 1: Update Algorithmic Analysis**
Rewrite the "Memory vs Debuggability" section to describe the new "Dual Strategy" architecture. Explain how the user can choose the trade-off.

**Step 2: Commit**
```bash
git add README.md
git commit -m "docs: update analysis to reflect dual strategy architecture"
```
