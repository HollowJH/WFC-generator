import { VerletObject } from './verlet.js';

const canvas = document.getElementById('physicsCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let objects = [];
const gravity = { x: 0, y: 500 }; // Pixels per second squared

function init() {
    objects = [];
    // Spawn a demo object
    const obj = new VerletObject(width / 2, 100);
    // Give it a little initial push (by offsetting oldPos)
    obj.oldPos.x -= 5;
    objects.push(obj);
}

function update(dt) {
    const subSteps = 8;
    const subDt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
        objects.forEach(obj => {
            obj.accelerate(gravity);
            applyConstraint(obj);
            obj.update(subDt);
        });
    }
}

function applyConstraint(obj) {
    // Circle constraint
    const center = { x: width / 2, y: height / 2 };
    const radius = 250;

    const dx = obj.pos.x - center.x;
    const dy = obj.pos.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius - obj.radius) {
        const n = { x: dx / dist, y: dy / dist };
        const penetration = dist - (radius - obj.radius);

        obj.pos.x -= n.x * penetration;
        obj.pos.y -= n.y * penetration;
    }
}

function draw() {
    // Clear background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw constraint
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 250, 0, Math.PI * 2);
    ctx.stroke();

    // Draw objects
    objects.forEach(obj => {
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Game Loop
let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(Math.min(dt, 0.05)); // Cap dt to prevent explosion on tab switch
    draw();
    requestAnimationFrame(loop);
}

// Setup
document.getElementById('btnReset').addEventListener('click', init);
init();
requestAnimationFrame(loop);
