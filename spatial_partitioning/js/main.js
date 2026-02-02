import { Quadtree, Rectangle } from './quadtree.js';

const canvas = document.getElementById('quadCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let particles = [];
let count = 100;
let showQuadtree = true;
let qtree;

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.r = 4;
        this.highlight = false;
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        this.highlight = false;
    }

    render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.highlight ? '#fff' : '#9c27b0';
        ctx.fill();
    }

    intersects(other) {
        const d = Math.hypot(this.x - other.x, this.y - other.y);
        return d < this.r + other.r;
    }
}

function init() {
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function drawQuadtree(qt) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        qt.boundary.x - qt.boundary.w,
        qt.boundary.y - qt.boundary.h,
        qt.boundary.w * 2,
        qt.boundary.h * 2
    );

    if (qt.divided) {
        drawQuadtree(qt.northeast);
        drawQuadtree(qt.northwest);
        drawQuadtree(qt.southeast);
        drawQuadtree(qt.southwest);
    }
}

function loop() {
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Build Quadtree
    const boundary = new Rectangle(width / 2, height / 2, width / 2, height / 2);
    qtree = new Quadtree(boundary, 4);

    particles.forEach(p => {
        p.move();
        qtree.insert(p);
    });

    // Collision Detection (Optimized)
    particles.forEach(p => {
        const range = new Rectangle(p.x, p.y, p.r * 2, p.r * 2);
        const others = qtree.query(range);

        for (let other of others) {
            if (p !== other && p.intersects(other)) {
                p.highlight = true;
                other.highlight = true;
            }
        }
    });

    // Draw
    if (showQuadtree) {
        drawQuadtree(qtree);
    }

    particles.forEach(p => p.render());

    requestAnimationFrame(loop);
}

// UI Controls
const slider = document.getElementById('particleCount');
const countVal = document.getElementById('countVal');

slider.addEventListener('input', (e) => {
    count = parseInt(e.target.value);
    countVal.textContent = count;
    init();
});

document.getElementById('toggleQuadtree').addEventListener('change', (e) => {
    showQuadtree = e.target.checked;
});

// Start
init();
loop();
