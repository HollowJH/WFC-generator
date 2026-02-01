import { images } from './assets.js';

/**
 * Represents a single Tile definition.
 * In a real WFC, this would hold image data. For now, it holds color and rule IDs.
 */
export class Tile {
    constructor(name, image, sockets, weight = 1, rotation = 0) {
        this.name = name;
        this.image = image; // Image object (or key)
        this.sockets = sockets;
        this.weight = weight;
        this.color = null; // Optional fallback
        this.rotation = rotation; // 0, 1, 2, 3 (units of 90 degrees)
    }

    // Rotates the tile 90 degrees clockwise and returns a new Tile
    rotate(times = 1) {
        let newSockets = [...this.sockets];
        for (let i = 0; i < times; i++) {
            // [N, E, S, W] -> [W, N, E, S]
            newSockets.unshift(newSockets.pop());
        }
        const rotatedTile = new Tile(`${this.name}_rot${times}`, this.image, newSockets, this.weight, (this.rotation + times) % 4);
        rotatedTile.color = this.color;
        return rotatedTile;
    }
}

// Better Simple Set for MVP:
// 0: Deep Water
// 1: Water
// 2: Sand
// 3: Land
// 4: Forest
// 5: Mountain

// Sockets:
// 0 connects to 0
// 1 connects to 1
// 01 connects 0 and 1
export function createSimpleTiles() {
    // Format: Name, Image, [N, E, S, W], Weight
    const tiles = [];

    // 1. Deep Ocean (Connects only to itself and Water)
    const tDeep = new Tile("Deep", images["deep"], ["D", "D", "D", "D"], 1);
    tDeep.color = "#1a237e";
    tiles.push(tDeep);

    // 2. Water (Connects to Deep, Water, Sand)
    const tWater = new Tile("Water", images["water"], ["W", "W", "W", "W"], 8);
    tWater.color = "#0288d1";
    tiles.push(tWater);

    // 3. Sand (Connects to Water, Sand, Grass)
    const tSand = new Tile("Sand", images["sand"], ["S", "S", "S", "S"], 2);
    tSand.color = "#fbc02d";
    tiles.push(tSand);

    // 4. Grass (Connects to Sand, Grass, Forest)
    const tGrass = new Tile("Grass", images["grass"], ["G", "G", "G", "G"], 20);
    tGrass.color = "#7cb342";
    tiles.push(tGrass);

    // 5. Forest (Connects to Grass, Forest)
    const tForest = new Tile("Forest", images["forest"], ["F", "F", "F", "F"], 5);
    tForest.color = "#33691e";
    tiles.push(tForest);

    // 6. Mountain
    const tMountain = new Tile("Mountain", images["mountain"], ["M", "M", "M", "M"], 1);
    tMountain.color = "#9e9e9e";
    tiles.push(tMountain);

    // --- Transitions ---

    // Deep/Water Corner
    const dwc = new Tile("Deep_Water_Corner", images["deep"], ["D", "D", "W", "W"], 1);
    dwc.color = "#0d47a1";
    tiles.push(dwc);

    // Water/Sand Corner
    const wsc = new Tile("Water_Sand_Corner", images["water"], ["W", "W", "S", "S"], 1);
    wsc.color = "#4fc3f7";
    tiles.push(wsc);

    // Sand/Grass Corner
    const sgc = new Tile("Sand_Grass_Corner", images["sand"], ["S", "S", "G", "G"], 1);
    sgc.color = "#cddc39";
    tiles.push(sgc);

    // Grass/Forest Corner
    const gfc = new Tile("Grass_Forest_Corner", images["grass"], ["G", "G", "F", "F"], 1);
    gfc.color = "#558b2f";
    tiles.push(gfc);

    return tiles;
}

