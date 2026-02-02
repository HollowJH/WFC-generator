import { VerletObject } from './verlet.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const objects = [];
const gravity = { x: 0, y: 1000 };
const dt = 1 / 60;
const subSteps = 8;
const subDt = dt / subSteps;

// Initial object
objects.push(new VerletObject(canvas.width / 2, 100, 20));

function update() {
    for (let i = 0; i < subSteps; i++) {
        applyGravity();
        applyConstraints();
        updateObjects(subDt);
    }
}

function applyGravity() {
    for (const obj of objects) {
        obj.accelerate(gravity.x, gravity.y);
    }
}

function applyConstraints() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4;

    for (const obj of objects) {
        const dx = obj.pos.x - centerX;
        const dy = obj.pos.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius - obj.radius) {
            const nX = dx / dist;
            const nY = dy / dist;
            obj.pos.x = centerX + nX * (radius - obj.radius);
            obj.pos.y = centerY + nY * (radius - obj.radius);
        }
    }
}

function updateObjects(dt) {
    for (const obj of objects) {
        obj.update(dt);
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw container
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw objects
    ctx.fillStyle = '#00ff88';
    for (const obj of objects) {
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Add more objects on click
canvas.addEventListener('mousedown', (e) => {
    objects.push(new VerletObject(e.clientX, e.clientY, 10 + Math.random() * 15));
});

document.getElementById('reset-btn').addEventListener('click', () => {
    objects.length = 0;
    objects.push(new VerletObject(canvas.width / 2, 100, 20));
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

loop();
