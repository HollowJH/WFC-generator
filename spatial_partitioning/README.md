# Spatial Partitioning (Quadtree)

A technical demonstration of spatial partitioning using a Quadtree to optimize spatial queries.

## Features
- Dynamic Quadtree implementation.
- Real-time visualization of the tree structure.
- Range query optimization (interactive mouse box).
- Benchmark controls for particle count.

## Why Quadtrees?
In a naive particle system, checking for collisions between $N$ particles takes $O(N^2)$ time. With spatial partitioning, we can reduce this significantly by only checking particles within the same or neighboring quadrants.

## Implementation Details
The `Quadtree` class recursively subdivides the 2D space into four quadrants once a threshold capacity is reached. Queries are performed by checking intersection with the query range and the boundaries of the tree's nodes.

## Usage
Open `index.html` in a browser. Use the slider to adjust particle count and watch the Quadtree dynamically adjust. Move your mouse to see real-time range queries.
