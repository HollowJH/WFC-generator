# WFC Responsiveness & Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve application responsiveness by implementing a "Hard Stop" for the Web Worker on reset and adding visual feedback for long-running operations.

**Architecture:**
- **Hard Stop:** Instead of sending a RESET message, we will terminate the Web Worker instance and recreate it. This ensures immediate stopping of any heavy calculation loops.
- **Visual Feedback:** We will implement a loading overlay/spinner that activates during "Fast Forward" and initialization, providing user feedback during blocking operations.

**Tech Stack:** JavaScript (ES6), Web Workers, CSS.

---

### Task 1: Implement Hard Worker Reset

**Files:**
- Modify: `js/main.js`

**Step 1: Refactor initWorker for Re-initialization**
Refactor `initWorker` and `reset` in `js/main.js` to handle termination.

```javascript
// In js/main.js

function initWorker() {
    // Terminate existing worker if it exists
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('./js/worker.js', { type: 'module' });

    worker.onmessage = function(e) {
        // ... existing onmessage handler ...
        const { type, payload } = e.data;
        if (type === 'UPDATE') {
             // ... existing logic ...

             // Hide loading when we get the first update or completion
             hideLoading();
        }
    };
}
```

**Step 2: Update Reset Logic**
Update `reset()` to call `initWorker()` every time, effectively performing a hard reset.

```javascript
function reset() {
    stopAutoRun();

    // Show loading immediately
    showLoading();

    // Re-create worker (Hard Stop)
    initWorker();

    const weights = {
        // ... existing weights extraction ...
    };

    worker.postMessage({
        type: 'INIT',
        payload: {
            gridDim: GRID_DIM,
            weights: weights,
            strategy: document.getElementById('strategySelect').value
        }
    });
}
```

**Step 3: Commit**
```bash
git add js/main.js
git commit -m "feat: implement hard worker termination on reset for immediate responsiveness"
```

### Task 2: Add Loading UI & Feedback

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`

**Step 1: Add Loading Overlay to HTML**
Add a specific "Processing" overlay (distinct from the initial loading screen) or reuse a generic one.

```html
<!-- In index.html, inside .canvas-container or body -->
<div id="processingOverlay" class="hidden">
    <div class="spinner"></div>
    <p id="processingText">Processing...</p>
</div>
```

**Step 2: Style the Overlay**
Add CSS for the overlay and a simple spinner.

```css
/* In css/style.css */
#processingOverlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 100;
    pointer-events: none; /* Block clicks but let visual pass? Actually we want to block clicks */
    pointer-events: all;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.canvas-container {
    position: relative; /* Ensure overlay covers just the canvas area if placed there */
}
```

**Step 3: Implement Show/Hide Logic**
Add helpers in `js/main.js` and hook them up to `fastForward`.

```javascript
// In js/main.js

function showLoading(text = "Processing...") {
    const overlay = document.getElementById('processingOverlay');
    const txt = document.getElementById('processingText');
    if (overlay && txt) {
        txt.textContent = text;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function fastForward() {
    if (status === "COMPLETED" || status === "FAILED") {
        reset();
        return; // reset() will handle its own loading state if we want, or we can let it fall through
    }

    showLoading("Generating...");

    // Give UI a moment to render before blocking main thread (though worker doesn't block main thread,
    // postMessage overhead might cause a slight stutter)
    requestAnimationFrame(() => {
        worker.postMessage({ type: 'RUN_UNTIL_DONE' });
    });
}
```

**Step 4: Commit**
```bash
git add index.html css/style.css js/main.js
git commit -m "feat: add processing overlay and spinner for long-running operations"
```
