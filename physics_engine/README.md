# Verlet Physics Engine

A simple physics engine scaffold using Verlet integration.

## Features
- Verlet Integration for stable motion.
- Sub-stepping for better collision and constraint resolution.
- Circular constraint.
- Interactive particle spawning.

## Implementation Details
The engine uses the formula:
`pos += (pos - oldPos) + acceleration * dt * dt`

This approach is inherently more stable than standard Euler integration as velocity is implicitly handled by the difference in positions.

## Usage
Open `index.html` in a browser. Click anywhere to spawn new physics objects.
