import { createSimpleTiles } from './tile.js';
import { images, loadImages } from './assets.js';

// --- Configuration ---
const CANVAS_SIZE = 600;
let GRID_DIM = 10;
let FPS = 30; // Speed of auto-run

// --- State ---
let worker;
let grid = [];
let status = "READY";
let stackDepth = 0;
let remaining = 0;
let canvas, ctx;
let isRunning = false;
let autoRunId = null;
let lastTime = 0;
let showEntropy = false;

// --- Setup ---
window.onload = async () => {
    // Start loading assets immediately
    const assetLoadPromise = loadImages();

    canvas = document.getElementById('wfcCanvas');
    ctx = canvas.getContext('2d');

    // UI Event Listeners
    document.getElementById('btnReset').addEventListener('click', reset);
    document.getElementById('btnStep').addEventListener('click', step);
    document.getElementById('btnRun').addEventListener('click', toggleRun);
    document.getElementById('btnFastForward').addEventListener('click', fastForward);
    document.getElementById('dimInput').addEventListener('change', (e) => {
        GRID_DIM = parseInt(e.target.value);
        reset();
    });
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        FPS = parseInt(e.target.value);
    });

    document.getElementById('chkEntropy').addEventListener('change', (e) => {
        showEntropy = e.target.checked;
        draw();
    });

    // Portfolio Features
    document.getElementById('btnSaveImg').addEventListener('click', saveImage);
    document.getElementById('btnExport').addEventListener('click', exportJSON);

    // Biome Weights
    document.getElementById('waterWeight').addEventListener('input', (e) => {
        document.getElementById('waterWeightVal').textContent = e.target.value;
    });
    document.getElementById('landWeight').addEventListener('input', (e) => {
        document.getElementById('landWeightVal').textContent = e.target.value;
    });
    document.getElementById('mountainWeight').addEventListener('input', (e) => {
        document.getElementById('mountainWeightVal').textContent = e.target.value;
    });
    document.getElementById('btnApplyWeights').addEventListener('click', reset);

    // God Mode
    canvas.addEventListener('click', handleCanvasClick);
    document.getElementById('btnCloseOverlay').addEventListener('click', hideGodModeOverlay);

    // Click outside to close God Mode
    document.getElementById('godModeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'godModeOverlay') {
            hideGodModeOverlay();
        }
    });

    // Escape to close God Mode
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideGodModeOverlay();
        }
    });

    // Wait for assets before initializing
    await assetLoadPromise;

    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }

    // Initialize Worker
    initWorker();

    // Initialize UI-only tile list for Legend/GodMode
    initTilesUI();

    reset();
};

function initWorker() {
    worker = new Worker('./js/worker.js', { type: 'module' });

    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'UPDATE') {
            grid = payload.grid;
            status = payload.status;
            stackDepth = payload.stackDepth;
            remaining = payload.remaining;

            draw();
            updateStatus();

            if (!payload.changed || status === "COMPLETED" || status === "FAILED") {
                stopAutoRun();
            }
        }
    };
}

let baseTiles = [];

function initTilesUI() {
    baseTiles = createSimpleTiles();

    // Render Legend
    const legendDiv = document.getElementById('tileLegend');
    legendDiv.textContent = '';
    // Unique base tiles for legend (ignore rotations)
    baseTiles.forEach(t => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const imgContainer = document.createElement('div');
        imgContainer.className = 'legend-img-container';

        if (t.imageKey && images[t.imageKey]) {
            const img = document.createElement('img');
            img.src = images[t.imageKey].src;
            img.className = 'legend-tile-img';
            imgContainer.appendChild(img);
        } else {
            imgContainer.style.backgroundColor = t.color || "#f0f";
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = t.name;

        item.appendChild(imgContainer);
        item.appendChild(nameSpan);
        legendDiv.appendChild(item);
    });
}

function reset() {
    stopAutoRun();

    const weights = {
        water: parseInt(document.getElementById('waterWeight').value),
        land: parseInt(document.getElementById('landWeight').value),
        mountain: parseInt(document.getElementById('mountainWeight').value),
        forest: 6 // Default for now as no slider requested
    };

    worker.postMessage({
        type: 'INIT',
        payload: {
            gridDim: GRID_DIM,
            weights: weights
        }
    });
}

function step() {
    const stepsPerFrame = FPS > 60 ? Math.ceil(FPS / 60) : 1;
    worker.postMessage({ type: 'STEP', payload: { count: stepsPerFrame } });
}

function fastForward() {
    if (status === "COMPLETED" || status === "FAILED") {
        reset();
    }
    worker.postMessage({ type: 'RUN_UNTIL_DONE' });
}

function toggleRun() {
    if (isRunning) {
        stopAutoRun();
    } else {
        startAutoRun();
    }
}

function startAutoRun() {
    if (status === "COMPLETED" || status === "FAILED") {
        reset(); // Auto reset if finished
    }

    isRunning = true;
    document.getElementById('btnRun').textContent = "Pause";
    lastTime = performance.now();

    function loop(timestamp) {
        if (!isRunning) return;

        const effectiveFPS = Math.min(FPS, 60);
        const fpsInterval = 1000 / effectiveFPS;
        const elapsed = timestamp - lastTime;

        if (elapsed > fpsInterval) {
            lastTime = timestamp - (elapsed % fpsInterval);
            step();
        }

        autoRunId = requestAnimationFrame(loop);
    }
    autoRunId = requestAnimationFrame(loop);
}

function stopAutoRun() {
    isRunning = false;
    if (autoRunId) cancelAnimationFrame(autoRunId);
    document.getElementById('btnRun').textContent = "Auto Run";
}

function updateStatus() {
    const statusEl = document.getElementById('statusText');
    statusEl.textContent = status;
    statusEl.style.color = status === "FAILED" ? "red" : (status === "COMPLETED" ? "#4caf50" : "white");

    // Count remaining uncollapsed cells
    document.getElementById('remainingText').textContent = remaining;

    // Update stack depth
    document.getElementById('stackDepthText').textContent = stackDepth;
}

// --- Portfolio Features (Tools Programming) ---

function saveImage() {
    const link = document.createElement('a');
    link.download = `wfc_map_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function exportJSON() {
    if (status !== "COMPLETED") {
        alert("Please wait for generation to complete before exporting.");
        return;
    }

    // Convert grid to simple 2D array of tile IDs
    const mapData = {
        width: GRID_DIM,
        height: GRID_DIM,
        tiles: grid.map(cell => cell.options[0].name)
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData, null, 2));
    const link = document.createElement('a');
    link.download = `wfc_map_${Date.now()}.json`;
    link.href = dataStr;
    link.click();
}

// --- Rendering ---
function draw() {
    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (grid.length === 0) return;

    const cellSize = CANVAS_SIZE / GRID_DIM;

    // Approximate max entropy for normalization
    const maxH = 4; // log(60ish)

    for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];
        const x = (i % GRID_DIM) * cellSize;
        const y = Math.floor(i / GRID_DIM) * cellSize;

        if (showEntropy) {
            // Re-calculate entropy locally for visualization
            const h = calculateEntropy(cell.options);
            const ratio = Math.min(1, h / maxH);
            const val = Math.floor(ratio * 255);
            ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctx.fillRect(x, y, cellSize, cellSize);

            if (cellSize > 20) {
                ctx.fillStyle = ratio > 0.5 ? "#000" : "#fff";
                ctx.font = `${Math.floor(cellSize / 3)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(cell.options.length, x + cellSize / 2, y + cellSize / 2);
            }
        } else {
            if (cell.collapsed) {
                // Draw the single chosen tile
                const tile = cell.options[0];
                drawTile(tile, x, y, cellSize);
            } else {
                // Draw superposition state
                if (cell.options.length === 0) {
                    // Failed state
                    ctx.fillStyle = "#400";
                    ctx.fillRect(x, y, cellSize, cellSize);
                    ctx.strokeStyle = "red";
                    ctx.beginPath();
                    ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y + cellSize);
                    ctx.moveTo(x + cellSize, y); ctx.lineTo(x, y + cellSize);
                    ctx.stroke();
                } else if (cell.options.length <= 4) {
                    // Draw up to 4 options with transparency
                    const originalAlpha = ctx.globalAlpha;
                    ctx.globalAlpha = 1.0 / cell.options.length;
                    for (const tile of cell.options) {
                        drawTile(tile, x, y, cellSize);
                    }
                    ctx.globalAlpha = originalAlpha;
                } else {
                    // Average color
                    let r = 0, g = 0, b = 0;
                    cell.options.forEach(t => {
                        const rgb = hexToRgb(t.color || "#000000");
                        r += rgb.r;
                        g += rgb.g;
                        b += rgb.b;
                    });
                    r = Math.floor(r / cell.options.length);
                    g = Math.floor(g / cell.options.length);
                    b = Math.floor(b / cell.options.length);

                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x, y, cellSize, cellSize);

                    if (cellSize > 20) {
                        ctx.fillStyle = "rgba(255,255,255,0.5)";
                        ctx.font = `${Math.floor(cellSize / 3)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(cell.options.length, x + cellSize / 2, y + cellSize / 2);
                    }
                }
            }
        }

        // Grid lines
        ctx.strokeStyle = "rgba(51, 51, 51, 0.5)";
        ctx.strokeRect(x, y, cellSize, cellSize);
    }
}

function calculateEntropy(options) {
    if (options.length <= 1) return 0;
    let sumWeights = 0;
    let sumWeightLogWeight = 0;
    for (const tile of options) {
        sumWeights += tile.weight;
        sumWeightLogWeight += tile.weight * Math.log(tile.weight);
    }
    if (sumWeights === 0) return 0;
    return Math.log(sumWeights) - (sumWeightLogWeight / sumWeights);
}

function drawTile(tile, x, y, size) {
    if (tile.imageKey && images[tile.imageKey]) {
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate((tile.rotation * 90 * Math.PI) / 180);
        ctx.drawImage(images[tile.imageKey], -size / 2, -size / 2, size, size);
        ctx.restore();
    } else {
        ctx.fillStyle = tile.color || "#f0f";
        ctx.fillRect(x, y, size, size);
    }
}

// --- Interaction (God Mode) ---

let selectedCellIndex = -1;

function handleCanvasClick(e) {
    if (isRunning) stopAutoRun(); // Pause when entering God Mode

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cellSize = CANVAS_SIZE / GRID_DIM;
    const col = Math.floor(mouseX / cellSize);
    const row = Math.floor(mouseY / cellSize);

    if (col >= 0 && col < GRID_DIM && row >= 0 && row < GRID_DIM) {
        const index = row * GRID_DIM + col;
        showGodModeOverlay(index);
    }
}

function showGodModeOverlay(index) {
    selectedCellIndex = index;
    const cell = grid[index];
    if (!cell) return;

    const overlay = document.getElementById('godModeOverlay');
    const optionsDiv = document.getElementById('tileOptions');

    optionsDiv.textContent = ''; // Avoid innerHTML

    // Sort options by name to keep it consistent
    const sortedOptions = [...cell.options].sort((a, b) => a.name.localeCompare(b.name));

    sortedOptions.forEach(tile => {
        const btn = document.createElement('div');
        btn.className = 'tile-option';

        // Use a temporary canvas to show rotated tile in the UI
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 64;
        tempCanvas.height = 64;
        const tempCtx = tempCanvas.getContext('2d');

        if (tile.imageKey && images[tile.imageKey]) {
            tempCtx.translate(32, 32);
            tempCtx.rotate((tile.rotation * 90 * Math.PI) / 180);
            tempCtx.drawImage(images[tile.imageKey], -32, -32, 64, 64);
        } else {
            tempCtx.fillStyle = tile.color || "#f0f";
            tempCtx.fillRect(0, 0, 64, 64);
        }

        const img = document.createElement('img');
        img.src = tempCanvas.toDataURL();
        img.title = tile.name;

        const label = document.createElement('span');
        label.textContent = `${tile.name}${tile.rotation > 0 ? ` (${tile.rotation * 90}°)` : ''}`;

        btn.appendChild(img);
        btn.appendChild(label);
        btn.addEventListener('click', () => selectTile(tile));
        optionsDiv.appendChild(btn);
    });

    overlay.classList.remove('hidden');
}

function hideGodModeOverlay() {
    document.getElementById('godModeOverlay').classList.add('hidden');
    selectedCellIndex = -1;
}

function selectTile(tile) {
    if (selectedCellIndex === -1) return;

    worker.postMessage({
        type: 'COLLAPSE',
        payload: {
            index: selectedCellIndex,
            tileName: tile.name,
            rotation: tile.rotation
        }
    });

    hideGodModeOverlay();
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}
