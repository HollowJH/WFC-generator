export const images = {};

export const TILE_NAMES = ["deep", "water", "sand", "grass", "forest", "mountain"];

/**
 * Loads all tile images from the assets/tiles/ directory.
 * @returns {Promise<void>} Resolves when all images are loaded.
 */
export async function loadImages() {
    console.log("Loading assets...");
    const loadPromises = TILE_NAMES.map(name => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `assets/tiles/${name}.png`;
            img.onload = () => {
                images[name] = img;
                resolve();
            };
            img.onerror = (err) => {
                console.error(`Failed to load image: assets/tiles/${name}.png`, err);
                // We resolve anyway to not block the whole application,
                // but we logged the error.
                resolve();
            };
        });
    });

    await Promise.all(loadPromises);
    console.log("Assets loaded.");
}
