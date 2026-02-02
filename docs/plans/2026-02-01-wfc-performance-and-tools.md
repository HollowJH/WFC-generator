# WFC Performance & Tools Expansion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the WFC generator into a high-performance, customizable tool by offloading logic to a Web Worker and adding a dynamic weight configuration UI.

**Architecture:**
- **Concurrency:** Move `WFCModel`, `MinHeap`, and `Tile` logic into `js/worker.js`. Main thread handles rendering and user input only.
- **Message Passing:** Use `postMessage` for state updates (`INIT`, `STEP`, `UPDATE_WEIGHTS`, `BACKTRACK_EVENT`).
- **Configuration:** Update `Tile` generation to accept a "Weights Config" object instead of hardcoded values.

**Tech Stack:** JavaScript (Web Workers), HTML5 Canvas.

---

### Task 1: Web Worker Infrastructure

**Files:**
- Create: `js/worker.js`
- Modify: `js/main.js`
- Modify: `js/wfc.js` (Export logic for worker)
- Modify: `js/tile.js` (Export logic for worker)

**Step 1: Extract Core Logic to Worker**
Create `js/worker.js` that imports `WFCModel` and `createSimpleTiles`.
It should handle message: `{ type: "INIT", dim: 10, weights: {...} }`.

**Step 2: Refactor Main.js to use Worker**
Replace the direct `model = new WFCModel()` call with `worker = new Worker('js/worker.js')`.
Handle `onmessage` to receive grid updates and redraw.

**Step 3: Implement "Headless" Loop**
The worker needs a loop that runs the WFC steps.
It should send `{ type: "UPDATE", grid: ... }` back to main thread periodically (or every step, depending on speed).
*Optimization:* Send updates every N steps to avoid flooding the bridge.

**Step 4: Commit**
```bash
git add js/worker.js js/main.js
git commit -m "refactor: offload WFC logic to Web Worker"
```

### Task 2: Dynamic Weights UI

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`
- Modify: `js/worker.js`
- Modify: `js/tile.js`

**Step 1: Create UI Panel**
Add a "Biome Weights" section to `index.html` with sliders for:
- Water (Deep/Water)
- Land (Grass/Forest)
- Mountains
- Transitions

**Step 2: Update Tile Generation**
Modify `createSimpleTiles(weightConfig)` to use passed weights instead of defaults.

**Step 3: Wire up Events**
In `js/main.js`, when sliders change:
1. Send `{ type: "RESTART", weights: { water: 50, land: 10 ... } }` to Worker.
2. Worker re-initializes `WFCModel` with new tiles.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add dynamic biome weight configuration UI"
```

### Task 3: Performance Tuning (Batching)

**Files:**
- Modify: `js/worker.js`
- Modify: `js/main.js`

**Step 1: Implement Batching**
The Worker is fast. Sending 60 messages per second is fine, but sending 1000 is bad.
Add logic to Worker: "Run X steps, then postMessage".
Adjust X based on performance or fixed batch size (e.g., 50 steps per frame).

**Step 2: Add "Fast Forward" Mode**
Add a "Finish Instantly" button that tells Worker: "Run until done, do not post updates until finished."

**Step 3: Commit**
```bash
git add js/worker.js
git commit -m "perf: implement message batching and fast-forward"
```
