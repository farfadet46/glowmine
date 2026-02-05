// utils.js
export function hash(x, y, seed) {
    let h = (x + seed) * 374761393 + (y + seed) * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

export function rectsOverlap(r1, r2) {
    return !(r2.x >= r1.x + r1.w || r2.x + r2.w <= r1.x || r2.y >= r1.y + r1.h || r2.y + r2.h <= r1.y);
}
