# Arc Consistency (AC-4) Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize WFC propagation performance by replacing the naive neighbor iteration with an AC-4 style "Support Tracking" algorithm.

**Architecture:**
- **Pre-calculation:** On initialization, build a `supports` table that maps `(tile_id, direction) -> count`. This tells us how many valid neighbors a tile has in a given direction.
- **State Tracking:** Maintain a dynamic `compatible_neighbor_counts` grid. For each cell-tile-direction tuple, track how many valid options exist in the neighbor cell.
- **Propagation:** When an option is removed, decrement the counter for its compatible neighbors. If a counter hits zero, remove that option too.
- **Benefit:** Removes the need to iterate over all `neighbor.options` during propagation. We only touch neighbors when a constraint is strictly violated.

**Tech Stack:** JavaScript (ES6), Web Workers.

---

### Task 1: Pre-calculate Supports

**Files:**
- Modify: `js/wfc.js`

**Step 1: Define Support Structure**
Add a method to `WFCModel` to pre-calculate the compatibility table.
The structure will be: `this.compatTable[tileIndex][direction] -> Set(validNeighborTileIndices)`

**Step 2: Initialize Dynamic State**
Add `this.sumsOfOnes` (or similar name) to track supports during runtime.
Structure: `grid[cellIndex][tileIndex][direction] -> count`
Actually, standard AC-4 tracks "how many supports does option X at cell C have from direction D".
But WFC usually simplifies this: "When removing option X from cell C, notify neighbors".
Let's stick to the standard WFC optimization often called "Arc Consistency" in this context:
1. When `(cell, tile)` is removed:
2. For each `dir`:
3.   For each `neighbor_tile` compatible with `tile` in `dir`:
4.     Decrement `support[neighbor_cell][neighbor_tile][opposite_dir]`
5.     If support becomes 0 -> Remove `(neighbor_cell, neighbor_tile)` and add to stack.

**Refined Architecture:**
- `WFCModel` needs a 3D array `supports[cellIndex][tileIndex][direction]` (Int32Array for performance?).
- `WFCModel` needs a static `propagator[tileIndex][direction] -> [compatibleTileIndices]`.

**Step 3: Implementation**
Modify `initialize()` to build these structures.

### Task 2: Implement AC-4 Propagation

**Files:**
- Modify: `js/wfc.js`

**Step 1: Replace Propagate Logic**
Rewrite `propagate()` to use the new structures.
Instead of:
```javascript
for neighbor in neighbors:
  for option in neighbor.options:
     check_validity()
```
It becomes:
```javascript
while removalStack not empty:
  (cell, removedTile) = stack.pop()
  for dir in directions:
     neighbor = cell + dir
     compatibleTiles = propagator[removedTile][dir]
     for otherTile in compatibleTiles:
        supports[neighbor][otherTile][oppDir]--
        if supports == 0:
           remove(neighbor, otherTile)
           stack.push(neighbor, otherTile)
```

**Step 2: Update Backtracking**
Ensure `SnapshotStrategy` and `DeltaStrategy` still work.
- **Snapshot:** Saving the grid is NOT enough anymore. We must also save the `supports` array. This is expensive ($O(N \times T \times 4)$).
- **Delta:** We just need to undo the decrements. When restoring a tile, we increment the supports of its neighbors.

**CRITICAL DECISION:**
The memory cost of snapshotting the `supports` array (which is `GridSize * TileCount * 4` integers) might kill the "Snapshot" strategy's viability for even medium grids.
**Solution:** We only optimize `DeltaStrategy` (Fast Mode) with AC-4?
Or we accept that `rebuildHeap` (which recalculates entropy) might also need to `rebuildSupports` if we restore a snapshot?
Yes, `rebuildSupports` is $O(N \times T)$ but strictly faster than naive propagation.
Actually, `SnapshotStrategy` replaces the whole grid. We can just regenerate the `supports` array from the grid state after a restore. It's an $O(N \times T)$ operation, done once per undo step. That's acceptable for Debug mode.

**Step 3: Commit**
```bash
git add js/wfc.js
git commit -m "perf: implement AC-4 support tracking for optimized propagation"
```

### Task 3: Benchmarking

**Files:**
- Modify: `js/main.js` (Add benchmark toggle?)
- Modify: `README.md`

**Step 1: Verify Correctness**
Ensure the output is identical (rules obeyed).

**Step 2: Documentation**
Update `README.md` with the new optimization details.

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: document AC-4 optimization"
```
