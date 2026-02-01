# Wave Function Collapse Enhancement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the basic WFC generator into a robust, portfolio-ready system with image support, backtracking for contradictions, weighted rules, and "God Mode" user interactivity.

**Architecture:**
- **Model:** Enhanced `WFCModel` with history stack for backtracking and weighted entropy calculation.
- **Data:** `TileManager` to load images and manage weighted adjacency rules.
- **View:** Updated canvas renderer to draw images instead of colors.
- **Controller:** New UI controls for step-by-step execution, "God Mode" clicking, and speed control.

**Tech Stack:** JavaScript (ES6 Modules), HTML5 Canvas, CSS.

---

### Task 1: Setup & Assets

**Files:**
- Create: `assets/tiles/` (directory)
- Create: `js/assets.js`
- Modify: `index.html`

**Step 1: Create asset directory and placeholder images**
Create a script to generate placeholder PNGs (Grass, Water, Sand, etc.) so we have something to render.

**Step 2: Implement Asset Loader**
Create `js/assets.js` to handle async image loading.

```javascript
export const images = {};

export async function loadImages() {
    const tileNames = ["deep", "water", "sand", "grass", "forest", "mountain"];
    // For now, generate data URIs or load from assets/tiles/
    // ... implementation ...
}
```

**Step 3: Update HTML**
Add loading screen or status indicator to `index.html`.

**Step 4: Commit**
```bash
git add .
git commit -m "chore: setup assets and loader"
```

---

### Task 2: Weighted Rules & Tile Definition

**Files:**
- Modify: `js/tile.js`

**Step 1: Update Tile Class**
Add `weight` property to `Tile` class.

```javascript
export class Tile {
    constructor(name, image, sockets, weight = 1) {
        this.name = name;
        this.image = image; // Now an Image object, not color string
        this.sockets = sockets;
        this.weight = weight;
    }
    // ... rotate method updates ...
}
```

**Step 2: Update Rules**
Modify `createSimpleTiles` to use images and assign weights (e.g., Grass = 10, Mountain = 1).

**Step 3: Commit**
```bash
git add js/tile.js
git commit -m "feat: add weights and image support to Tile"
```

---

### Task 3: Enhanced WFC Model (Backtracking)

**Files:**
- Modify: `js/wfc.js`

**Step 1: Implement History Stack**
Add `stack` to `WFCModel` to track changes (collapsed cells, domain reductions) for backtracking.

```javascript
class WFCModel {
    constructor(...) {
        this.history = []; // Stack of { cellIndex, removedOptions: [] }
    }
    // ...
}
```

**Step 2: Implement Weighted Entropy**
Update `getLowestEntropyCell` to use Shannon entropy calculation based on tile weights, rather than just `options.length`.

**Step 3: Implement Backtracking Logic**
If `propagate` returns false (contradiction), pop from history and try a different option for the previous cell.

**Step 4: Commit**
```bash
git add js/wfc.js
git commit -m "feat: add backtracking and weighted entropy"
```

---

### Task 4: Visualization Update

**Files:**
- Modify: `js/main.js`

**Step 1: Update Renderer**
Change `drawGrid` to render `tile.image`.
For superposition (uncollapsed cells), draw valid options with transparency (alpha = 1 / valid_count).

**Step 2: Implement "God Mode" Input**
Add click handler to canvas.
- Identify clicked cell.
- Show popup/overlay to select a tile.
- Force-collapse that cell to the selected tile.
- Propagate changes.

**Step 3: Step Control**
Add UI buttons: "Step", "Auto-Run", "Pause", "Reset".
Hook them into the `WFCModel`.

**Step 4: Commit**
```bash
git add js/main.js
git commit -m "feat: update visualization and add interactive controls"
```

---

### Task 5: User Interface Polish

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

**Step 1: Improve Layout**
Make room for the "God Mode" palette and playback controls.

**Step 2: Add Speed Control**
Add a slider to control the delay between steps in Auto-Run mode.

**Step 3: Commit**
```bash
git add .
git commit -m "style: polish UI and layout"
```
