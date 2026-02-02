# Portfolio Showcase & Expansion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the WFC Generator to "Tech Showcase" level and scaffold the next two portfolio projects (Verlet Physics, Spatial Partitioning) to ensure a cohesive, professional portfolio.

**Architecture:**
- **WFC Polish:** Add a "Debug View" layer to the existing renderer to visualize entropy. Enhance `README.md` with technical explanations.
- **Physics Engine:** Scaffold a new folder with an HTML5 Canvas loop and a `VerletObject` class structure.
- **Spatial Partitioning:** Scaffold a new folder with a `Quadtree` class structure and a particle system benchmarker.

**Tech Stack:** JavaScript (ES6 Modules), HTML5 Canvas.

---

## Part 1: WFC Tech Polish

### Task 1: Entropy Heatmap Visualization

**Files:**
- Modify: `js/main.js`
- Modify: `css/style.css`
- Modify: `index.html`

**Step 1: Add "Debug Mode" Toggle**
Add a checkbox "Show Entropy" to the controls area in `index.html`.

**Step 2: Implement Heatmap Rendering**
Update `draw()` in `js/main.js`.
If "Show Entropy" is checked:
- Instead of drawing tiles, calculate the ratio `current_entropy / max_entropy`.
- `max_entropy` is roughly `log(total_tiles)`.
- Draw a grayscale square: Black = Low Entropy (Collapsed/Certain), White = High Entropy (Uncertain).
- Overlay the number of valid options as text.

**Step 3: Commit**
```bash
git add .
git commit -m "feat: add entropy heatmap visualization"
```

### Task 2: Technical Documentation Upgrade

**Files:**
- Modify: `README.md`

**Step 1: Write "Algorithmic Highlights" Section**
Add a section explaining:
- **Min-Heap Optimization**: Why it makes selection $O(1)$.
- **Backtracking**: How it solves contradictions.
- **Weighted Entropy**: How it creates organic terrain.

**Step 2: Commit**
```bash
git add README.md
git commit -m "docs: add technical breakdown of optimizations"
```

---

## Part 2: Physics Engine Scaffold

### Task 3: Verlet Engine Setup

**Files:**
- Create: `physics_engine/index.html`
- Create: `physics_engine/css/style.css`
- Create: `physics_engine/js/main.js`
- Create: `physics_engine/js/verlet.js`
- Create: `physics_engine/README.md`

**Step 1: Create HTML Skeleton**
Standard canvas setup with a "Reset" button.

**Step 2: Create Core Verlet Loop**
In `js/verlet.js`:
```javascript
export class VerletObject {
    constructor(x, y) {
        this.pos = {x, y};
        this.oldPos = {x, y};
        this.acceleration = {x: 0, y: 0};
    }

    update(dt) {
        const vel = {
            x: this.pos.x - this.oldPos.x,
            y: this.pos.y - this.oldPos.y
        };
        this.oldPos = {...this.pos};
        this.pos.x += vel.x + this.acceleration.x * dt * dt;
        this.pos.y += vel.y + this.acceleration.y * dt * dt;
        this.acceleration = {x: 0, y: 0};
    }
}
```

**Step 3: Commit**
```bash
git add physics_engine/
git commit -m "feat: scaffold verlet physics engine"
```

---

## Part 3: Spatial Partitioning Scaffold

### Task 4: Quadtree Benchmark Setup

**Files:**
- Create: `spatial_partitioning/index.html`
- Create: `spatial_partitioning/css/style.css`
- Create: `spatial_partitioning/js/main.js`
- Create: `spatial_partitioning/js/quadtree.js`
- Create: `spatial_partitioning/README.md`

**Step 1: Create HTML Skeleton**
Canvas + "Particle Count" slider + "Toggle Quadtree" checkbox.

**Step 2: Create Quadtree Class Structure**
In `js/quadtree.js`:
```javascript
export class Quadtree {
    constructor(boundary, capacity) {
        this.boundary = boundary; // {x, y, w, h}
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
    }
    // insert(), subdivide(), query() stubs
}
```

**Step 3: Commit**
```bash
git add spatial_partitioning/
git commit -m "feat: scaffold spatial partitioning project"
```
