export class VerletObject {
    constructor(x, y, radius = 10) {
        this.pos = {x, y};
        this.oldPos = {x, y};
        this.acceleration = {x: 0, y: 0};
        this.radius = radius;
    }

    update(dt) {
        const vel = {
            x: this.pos.x - this.oldPos.x,
            y: this.pos.y - this.oldPos.y
        };
        this.oldPos = {...this.pos};
        this.pos.x += vel.x + this.acceleration.x * dt * dt;
        this.pos.y += vel.y + this.acceleration.y * dt * dt;
        this.acceleration = {x: 0, y: 0};
    }

    accelerate(ax, ay) {
        this.acceleration.x += ax;
        this.acceleration.y += ay;
    }
}
