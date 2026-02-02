import { Quadtree, Rectangle, Point } from './quadtree.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const countSlider = document.getElementById('particle-count');
const countVal = document.getElementById('count-val');
const showQT = document.getElementById('show-quadtree');
const fpsVal = document.getElementById('fps');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.r = 2;
        this.highlight = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        this.highlight = false;
    }

    draw() {
        ctx.fillStyle = this.highlight ? '#ff0055' : '#00ffcc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

let particles = [];
let lastTime = 0;

function initParticles(n) {
    particles = [];
    for (let i = 0; i < n; i++) {
        particles.push(new Particle());
    }
}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    fpsVal.textContent = Math.round(1000 / dt);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boundary = new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    const qt = new Quadtree(boundary, 4);

    for (const p of particles) {
        p.update();
        qt.insert(new Point(p.x, p.y, p));
    }

    if (showQT.checked) {
        qt.show(ctx);
    }

    // Query example: Mouse range
    const range = new Rectangle(mouseX, mouseY, 50, 50);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(range.x - range.w, range.y - range.h, range.w * 2, range.h * 2);

    const found = qt.query(range);
    for (const point of found) {
        point.data.highlight = true;
    }

    for (const p of particles) {
        p.draw();
    }

    requestAnimationFrame(loop);
}

let mouseX = 0;
let mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

countSlider.addEventListener('input', (e) => {
    const n = parseInt(e.target.value);
    countVal.textContent = n;
    initParticles(n);
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles(particles.length);
});

initParticles(500);
requestAnimationFrame(loop);
