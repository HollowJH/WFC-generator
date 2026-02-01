import zlib
import struct
import os

def create_png(filename, width, height, color):
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    # Width: 4 bytes, Height: 4 bytes, Bit depth: 1 byte (8), Color type: 1 byte (2, RGB),
    # Compression: 1 byte (0), Filter: 1 byte (0), Interlace: 1 byte (0)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = b'IHDR' + ihdr_data
    ihdr_crc = struct.pack('>I', zlib.crc32(ihdr_chunk) & 0xffffffff)
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + ihdr_chunk + ihdr_crc

    # IDAT chunk
    # Scanlines start with a filter type byte (0 for None)
    r, g, b = color
    pixel = struct.pack('BBB', r, g, b)
    scanline = b'\x00' + (pixel * width)
    image_data = scanline * height
    compressed_data = zlib.compress(image_data)
    idat_chunk = b'IDAT' + compressed_data
    idat_crc = struct.pack('>I', zlib.crc32(idat_chunk) & 0xffffffff)
    idat_chunk = struct.pack('>I', len(compressed_data)) + idat_chunk + idat_crc

    # IEND chunk
    iend_chunk = b'\x00\x00\x00\x00IEND\xaeB`\x82'

    with open(filename, 'wb') as f:
        f.write(signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

tiles = {
    "deep": (0, 0, 139),      # Dark Blue (R, G, B)
    "water": (0, 0, 255),     # Blue
    "sand": (244, 164, 96),   # Sandy Brown
    "grass": (34, 139, 34),   # Forest Green
    "forest": (0, 100, 0),    # Dark Green
    "mountain": (128, 128, 128) # Gray
}

os.makedirs('assets/tiles', exist_ok=True)

for name, color in tiles.items():
    create_png(f'assets/tiles/{name}.png', 16, 16, color)
    print(f'Generated assets/tiles/{name}.png')
