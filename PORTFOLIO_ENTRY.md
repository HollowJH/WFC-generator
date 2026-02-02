# Project: Optimized Wave Function Collapse Engine

**Tech Stack:** JavaScript (ES6), Web Workers, Canvas API
**Repo/Live Demo:** [Insert Link]

## Context & Motivation
I built this project to explore procedural generation using the Wave Function Collapse (WFC) algorithm. While the core algorithm is well-known, I realized during testing that standard JavaScript implementations struggle with performance on the web. Once I tried generating grids larger than 50x50, the recursive backtracking would often stack overflow, and the sheer number of object allocations caused the browser to stutter significantly.

Instead of just treating this as a visual experiment, I decided to treat it as a systems engineering challenge: **How do you make an NP-hard constraint solver run smoothly at 60 FPS in a single-threaded browser environment?**

## Technical Challenges & Solutions

### 1. Propagation Bottlenecks (Optimization)
**The Problem:** The standard WFC propagation step is inefficient. It checks every neighbor of a changed cell to see if its options are still valid ($O(T^2)$). On a large map, this redundancy became the main bottleneck.
**My Solution:** I researched and implemented **AC-4 (Arc Consistency)** principles. Instead of iterating over neighbors blindly, I implemented a "support counting" system. I pre-calculate how many valid neighbors each tile option has. When a tile is removed, I simply decrement the counts of its neighbors. Propagation only triggers when a count hits zero. This reduced the complexity to roughly $O(T)$, which was essential for larger grids.

### 2. Memory & Garbage Collection (Systems)
**The Problem:** The JavaScript Garbage Collector (GC) was causing frame drops. Profiling the heap showed that my initial implementation—which created temporary `{index, tile}` objects for every step in the propagation stack—was generating megabytes of short-lived garbage.
**My Solution:** I refactored the hot-path data structures to avoid allocation during the render loop.
*   **Min-Heap:** I replaced the array of node objects with a **Structure of Arrays (SoA)** layout using parallel `Int32Array` and `Float64Array` buffers.
*   **Stacks:** I converted the recursion stack into a flat integer array.
*   **In-Place Operations:** I replaced methods like `Array.filter()` (which creates new arrays) with a swap-and-pop strategy.
**Result:** This effectively eliminated GC pauses during the generation phase, keeping the frame time consistent.

### 3. State Management vs. Memory (Architecture)
**The Problem:** To solve "hard" seeds, the algorithm needs to backtrack. Initially, I saved a full snapshot of the grid at every step. While robust, this consumed $O(N)$ memory per step, causing the browser to run out of memory on 100x100 grids.
**My Solution:** I used the **Strategy Pattern** to decouple the history logic from the core engine:
*   **SnapshotStrategy:** Clones the entire grid. Useful for "God Mode" debugging where I need to jump to arbitrary points in time.
*   **DeltaStrategy:** Stores only the specific tile change (diff). Uses $O(1)$ memory.
This allowed me to toggle between a memory-heavy "Debug Mode" and a streamlined "Performance Mode" without rewriting the solver.

### 4. Responsiveness (UX/Concurrency)
**The Problem:** The "Skip Animation" feature initially ran a `while(true)` loop that locked the UI thread, freezing the browser window until the map was finished.
**My Solution:** I moved the calculation to a **Web Worker** and implemented a **Time-Budgeted** execution loop. The worker processes a batch of steps (e.g., 500), checks `performance.now()`, and if 100ms has passed, it yields execution to send a progress message to the main thread. This keeps the UI responsive and allows the user to see a live "Remaining Cells" counter.

## Results
*   Successfully generates 200x200 grids (40,000 cells) in the browser.
*   Intelligent backtracking using a "Degree Heuristic" (tie-breaking by most constrained variable).
*   Responsive UI even during heavy constraint solving.

## Code Highlight: Allocation-Free Priority Queue
To avoid GC overhead in the critical path, I implemented the Min-Heap using TypedArrays:

```javascript
class MinHeap {
    constructor(maxSize) {
        this.heapSize = 0;
        // Structure of Arrays (SoA) layout to prevent object allocation
        this.indices = new Int32Array(maxSize);
        this.entropies = new Float64Array(maxSize);
        this.optionCounts = new Int32Array(maxSize);
    }

    push(index, entropy, optionsCount) {
        // ... implementation details ...
    }
}
```

## What I Learned
This project taught me that knowing an algorithm (WFC) is different from engineering a system that uses it. The theoretical correctness of the solver wasn't enough; I had to understand the JavaScript runtime—specifically how memory allocation and the event loop work—to make it usable. It shifted my perspective from just "getting code to work" to "getting code to perform."
