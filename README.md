# Wave Function Collapse Generator

A JavaScript implementation of the **Wave Function Collapse (WFC)** algorithm using the Simple Tiled Model. This project demonstrates procedural generation by constraint solving, creating coherent 2D tilemaps from a small set of rules.

## How It Works
1.  **Superposition**: Every cell in the grid starts with all possible tiles (Deep Water, Water, Sand, Grass, Forest).
2.  **Entropy**: The algorithm finds the cell with the fewest possible valid options (lowest entropy).
3.  **Collapse**: That cell is forced to choose one tile randomly.
4.  **Propagation**: The constraints (sockets) of the chosen tile propagate to neighbors, removing invalid options. This chain reaction ensures global consistency.

## Algorithmic Highlights
This implementation goes beyond the basic WFC algorithm by incorporating several advanced techniques to ensure efficiency and robustness:

-   **Optimization (Min-Heap Priority Queue)**: Instead of a naive $O(N)$ scan to find the cell with the lowest entropy, we utilize a Min-Heap. This reduces the complexity of retrieving the next cell to $O(1)$ and updating entropy to $O(\log N)$. We employ a **"Lazy Deletion"** strategy to handle stale heap entries efficiently.
-   **Robustness (Backtracking History Stack)**: WFC can often reach a "contradiction" (a state where a cell has zero valid options). Our solver tracks the state history in a stack, allowing it to backtrack and attempt different choices when a dead end is encountered, significantly increasing the success rate of generation.
-   **Organic Generation (Weighted Entropy)**: To avoid "noisy" outputs, the algorithm uses Shannon Entropy weighted by tile frequency. We specifically tuned the weights to favor land tiles, resulting in coherent 70% landmasses rather than fragmented islands.
-   **Tools Programming (God Mode Debugger)**: The project includes an interactive debugger that allows manual constraint enforcement. Users can "paint" tiles to force the algorithm to solve around specific seeds, demonstrating the power of constraint-based procedural generation.

## Project Structure
-   `index.html`: Main entry point.
-   `js/wfc.js`: Core algorithm (Model). Decoupled from UI.
-   `js/tile.js`: Tile definitions and socket rules.
-   `js/main.js`: Visualization and rendering logic (Controller/View).
-   `css/style.css`: Styling for the interface.

## Running the Project
Since this uses ES6 Modules, you cannot run it directly from the file system (file://) due to CORS restrictions in modern browsers.

### Option 1: VS Code Live Server (Recommended)
1.  Open the folder in VS Code.
2.  Install the "Live Server" extension.
3.  Right-click `index.html` and select "Open with Live Server".

### Option 2: Python Simple HTTP Server
If you have Python installed:
```bash
# Run in the project directory
python -m http.server
# Open http://localhost:8000
```
