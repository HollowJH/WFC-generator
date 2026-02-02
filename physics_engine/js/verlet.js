export class VerletObject {
    constructor(x, y) {
        this.pos = {x, y};
        this.oldPos = {x, y};
        this.acceleration = {x: 0, y: 0};
        this.radius = 10;
        this.color = '#ffffff';
    }

    update(dt) {
        const vel = {
            x: this.pos.x - this.oldPos.x,
            y: this.pos.y - this.oldPos.y
        };

        // Save current position
        this.oldPos = {...this.pos};

        // Verlet Integration: pos = pos + vel + acc * dt * dt
        this.pos.x += vel.x + this.acceleration.x * dt * dt;
        this.pos.y += vel.y + this.acceleration.y * dt * dt;

        // Reset acceleration
        this.acceleration = {x: 0, y: 0};
    }

    accelerate(acc) {
        this.acceleration.x += acc.x;
        this.acceleration.y += acc.y;
    }
}
