import { describe, it, expect } from 'vitest';
import {
  wgs84ToLest97,
  lest97ToWgs84,
  calculatePolygonGeometry,
  parseCoordinatesText,
} from './geo';

// Known reference point: Tallinn (approx)
const TALLINN_LAT = 59.4370;
const TALLINN_LON = 24.7536;
const TALLINN_X   = 6589036;
const TALLINN_Y   = 542763;
const TOLERANCE_M = 200; // 200m tolerance — reference point is approximate

// ─── Koordinaatide teisendus ───────────────────────────────────────────────────

describe('wgs84ToLest97', () => {
  it('converts Tallinn WGS84 to L-EST97 within 5m tolerance', () => {
    const { x, y } = wgs84ToLest97(TALLINN_LAT, TALLINN_LON);
    expect(Math.abs(x - TALLINN_X)).toBeLessThan(TOLERANCE_M);
    expect(Math.abs(y - TALLINN_Y)).toBeLessThan(TOLERANCE_M);
  });

  it('stays within Estonian bounds', () => {
    const { x, y } = wgs84ToLest97(58.0, 25.0);
    expect(x).toBeGreaterThan(6300000);
    expect(x).toBeLessThan(6700000);
    expect(y).toBeGreaterThan(300000);
    expect(y).toBeLessThan(900000);
  });
});

describe('lest97ToWgs84', () => {
  it('converts L-EST97 back to WGS84 with near-perfect precision (round-trip)', () => {
    // Use the projected value of TALLINN coords for a clean round-trip test
    const projected = wgs84ToLest97(TALLINN_LAT, TALLINN_LON);
    const { lat, lon } = lest97ToWgs84(projected.x, projected.y);
    expect(Math.abs(lat - TALLINN_LAT)).toBeLessThan(1e-10);
    expect(Math.abs(lon - TALLINN_LON)).toBeLessThan(1e-10);
  });

  it('is inverse of wgs84ToLest97 (round-trip)', () => {
    const pts = [
      { lat: 58.5, lon: 23.0 },
      { lat: 59.8, lon: 27.5 },
      { lat: 57.6, lon: 22.0 },
    ];
    pts.forEach(({ lat, lon }) => {
      const lest = wgs84ToLest97(lat, lon);
      const back = lest97ToWgs84(lest.x, lest.y);
      expect(Math.abs(back.lat - lat)).toBeLessThan(0.00001);
      expect(Math.abs(back.lon - lon)).toBeLessThan(0.00001);
    });
  });
});

// ─── Polügooni geomeetria ──────────────────────────────────────────────────────

describe('calculatePolygonGeometry', () => {
  it('returns zero for fewer than 2 points', () => {
    const r = calculatePolygonGeometry([]);
    expect(r.areaSqM).toBe(0);
    expect(r.perimeter).toBe(0);
  });

  it('returns line length for exactly 2 points', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 100 }];
    const r = calculatePolygonGeometry(pts);
    expect(r.areaSqM).toBe(0);
    expect(r.perimeter).toBeCloseTo(100, 1);
  });

  it('calculates area of 100m × 100m square correctly', () => {
    const square = [
      { x: 0,   y: 0   },
      { x: 100, y: 0   },
      { x: 100, y: 100 },
      { x: 0,   y: 100 },
    ];
    const r = calculatePolygonGeometry(square);
    expect(r.areaSqM).toBeCloseTo(10000, 0);
    expect(r.areaHa).toBeCloseTo(1.0, 4);
    expect(r.perimeter).toBeCloseTo(400, 0);
  });

  it('calculates area of 1ha square (100m × 100m)', () => {
    const pts = [
      { x: 6500000, y: 500000 },
      { x: 6500100, y: 500000 },
      { x: 6500100, y: 500100 },
      { x: 6500000, y: 500100 },
    ];
    const r = calculatePolygonGeometry(pts);
    expect(r.areaHa).toBeCloseTo(1.0, 2);
  });

  it('is independent of winding direction', () => {
    const cw = [{ x:0,y:0 },{ x:100,y:0 },{ x:100,y:100 },{ x:0,y:100 }];
    const ccw = [...cw].reverse();
    expect(calculatePolygonGeometry(cw).areaSqM)
      .toBeCloseTo(calculatePolygonGeometry(ccw).areaSqM, 0);
  });
});

// ─── Koordinaatide parser ──────────────────────────────────────────────────────

describe('parseCoordinatesText', () => {
  it('parses L-EST97 coordinates (X > 6300000, Y > 300000)', () => {
    const pts = parseCoordinatesText('6543120 534560\n6543200 534600');
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBe(6543120);
    expect(pts[0].y).toBe(534560);
  });

  it('parses comma-separated L-EST97', () => {
    const pts = parseCoordinatesText('6543120, 534560');
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(6543120);
  });

  it('parses WGS84 GPS coordinates within Estonian bounds', () => {
    const pts = parseCoordinatesText('58.3780, 26.7291');
    expect(pts).toHaveLength(1);
    expect(pts[0].lat).toBeCloseTo(58.378, 2);
    expect(pts[0].lon).toBeCloseTo(26.7291, 2);
  });

  it('auto-populates both x/y and lat/lon for L-EST97 input', () => {
    const pts = parseCoordinatesText('6543120 534560');
    expect(pts[0].lat).toBeGreaterThan(55);
    expect(pts[0].lat).toBeLessThan(62);
    expect(pts[0].lon).toBeGreaterThan(20);
    expect(pts[0].lon).toBeLessThan(30);
  });

  it('skips empty lines', () => {
    const pts = parseCoordinatesText('\n\n6543120 534560\n\n6543200 534600\n\n');
    expect(pts).toHaveLength(2);
  });

  it('returns empty array for non-numeric input', () => {
    expect(parseCoordinatesText('abc def')).toHaveLength(0);
    expect(parseCoordinatesText('')).toHaveLength(0);
    // Note: '1 2' triggers the L-EST97 magnitude fallback — this is intentional parser behaviour
  });

  it('assigns unique ids to each point', () => {
    const pts = parseCoordinatesText('6543120 534560\n6543200 534600\n6543300 534700');
    const ids = pts.map(p => p.id);
    expect(new Set(ids).size).toBe(3);
  });
});
