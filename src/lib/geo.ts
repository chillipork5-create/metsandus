// L-EST'97 (EPSG:3301) Lambert Conformal Conic Projection Formulas and Geo Utils
// Ellipsoid: GRS80 (a = 6378137.0, f = 1/298.257222101)

const a = 6378137.0;
const f = 1.0 / 298.257222101;
const eSquared = 2 * f - f * f;
const e = Math.sqrt(eSquared);

const deg2rad = (d: number) => d * Math.PI / 180;
const rad2deg = (r: number) => r * 180 / Math.PI;

const phi1 = deg2rad(58.0);
const phi2 = deg2rad(59.333333333); // 59°20'
const phi0 = deg2rad(57.517553889); // 57°31'03.194"
const lambda0 = deg2rad(24.0);

const x0 = 500000.0;  // Easting False Easting (Estonian Y)
const y0 = 6375000.0; // Northing False Northing (Estonian X)

// Precalculate projection constants
const m1 = Math.cos(phi1) / Math.sqrt(1 - eSquared * Math.sin(phi1) * Math.sin(phi1));
const m2 = Math.cos(phi2) / Math.sqrt(1 - eSquared * Math.sin(phi2) * Math.sin(phi2));

const tCalculated = (phi: number) => {
  const sinPhi = Math.sin(phi);
  const term1 = Math.tan(Math.PI / 4 - phi / 2);
  const term2 = Math.pow((1 - e * sinPhi) / (1 + e * sinPhi), e / 2);
  return term1 / term2;
};

const t1 = tCalculated(phi1);
const t2 = tCalculated(phi2);
const t0 = tCalculated(phi0);

const n = Math.log(m1 / m2) / Math.log(t1 / t2);
const F = m1 / (n * Math.pow(t1, n));
const rho0 = a * F * Math.pow(t0, n);

export interface GeoPoint {
  id: string;
  x: number;   // Northing (usually ~6400000)
  y: number;   // Easting (usually ~500000)
  lat: number; // WGS84 Latitude
  lon: number; // WGS84 Longitude
}

/**
 * Convert WGS84 Lat/Lon (decimal degrees) to L-EST'97 X(Northing)/Y(Easting) meters
 */
export function wgs84ToLest97(lat: number, lon: number): { x: number; y: number } {
  const phi = deg2rad(lat);
  const lambda = deg2rad(lon);

  const theta = n * (lambda - lambda0);
  const t = tCalculated(phi);
  const rho = a * F * Math.pow(t, n);

  const eastingY = x0 + rho * Math.sin(theta);
  const northingX = y0 + rho0 - rho * Math.cos(theta);

  return { x: northingX, y: eastingY };
}

/**
 * Convert L-EST'97 X(Northing)/Y(Easting) meters to WGS84 Lat/Lon (decimal degrees)
 */
export function lest97ToWgs84(x: number, y: number): { lat: number; lon: number } {
  const eastDev = y - x0;
  const northDev = rho0 - (x - y0);

  let rho = Math.sqrt(eastDev * eastDev + northDev * northDev);
  if (rho === 0) {
    return { lat: rad2deg(phi0), lon: rad2deg(lambda0) };
  }

  let theta = Math.atan2(eastDev, northDev);
  const lambda = lambda0 + theta / n;

  const t = Math.pow(rho / (a * F), 1 / n);

  // Solve for latitude by iteration
  let phi = Math.PI / 2 - 2 * Math.atan(t);
  for (let iter = 0; iter < 5; iter++) {
    const sinPhi = Math.sin(phi);
    const term2 = Math.pow((1 - e * sinPhi) / (1 + e * sinPhi), e / 2);
    phi = Math.PI / 2 - 2 * Math.atan(t * term2);
  }

  return { lat: rad2deg(phi), lon: rad2deg(lambda) };
}

/**
 * Calculates the polygon perimeter (in meters) and planar area (in square meters and hectares)
 * using Cartesian L-EST'97 coordinates.
 */
export function calculatePolygonGeometry(points: { x: number; y: number }[]): {
  areaSqM: number;
  areaHa: number;
  perimeter: number;
} {
  if (points.length < 3) {
    // If only 2 points, perimeter is the line length, area is 0
    if (points.length === 2) {
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      return { areaSqM: 0, areaHa: 0, perimeter: d };
    }
    return { areaSqM: 0, areaHa: 0, perimeter: 0 };
  }

  let areaSum = 0;
  let perimeterSum = 0;
  const numPoints = points.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % numPoints];

    // Area Shoelace formula term
    areaSum += p1.y * p2.x - p2.y * p1.x;

    // Perimeter distance
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    perimeterSum += Math.sqrt(dx * dx + dy * dy);
  }

  const areaSqM = Math.abs(areaSum) * 0.5;
  const areaHa = areaSqM / 10000;

  return { areaSqM, areaHa, perimeter: perimeterSum };
}

/**
 * Helper to generate a unique string ID.
 */
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parses coordinate values from clipboard / CSV / raw text
 */
export function parseCoordinatesText(text: string): GeoPoint[] {
  const lines = text.split(/\r?\n/);
  const parsedPoints: GeoPoint[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Use regex to locate floats/integers (supports optional decimal and signs)
    const matches = trimmed.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) continue;

    const nums = matches.map(m => parseFloat(m));
    if (nums.some(isNaN)) continue;

    let x = 0;
    let y = 0;
    let lat = 0;
    let lon = 0;
    let found = false;

    // 1. Try to find an explicit L-EST97 pair (Northing is 7-digit, Easting is 6-digit)
    // Northing range: [6300000, 6700000]
    // Easting range: [300000, 900000]
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        const val1 = nums[i];
        const val2 = nums[j];

        // L-EST97 checking
        const isX = val1 >= 6300000 && val1 <= 6700000;
        const isY = val2 >= 300000 && val2 <= 900000;

        if (isX && isY) {
          x = val1;
          y = val2;
          const wgs = lest97ToWgs84(x, y);
          lat = wgs.lat;
          lon = wgs.lon;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // 2. If not found, try to find an explicit WGS84 GPS pair within Estonian bounds
    if (!found) {
      for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
          if (i === j) continue;
          const val1 = nums[i];
          const val2 = nums[j];

          // Estonia Lat/Lon bounds
          const isLat = val1 >= 57.0 && val1 <= 60.5;
          const isLon = val2 >= 21.0 && val2 <= 28.5;

          if (isLat && isLon) {
            lat = val1;
            lon = val2;
            const projected = wgs84ToLest97(lat, lon);
            x = projected.x;
            y = projected.y;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // 3. Fallback: If no strict coordinates were found, but we have EXACTLY 2 numbers on the line,
    // let's parse them using standard magnitudes or fallback ordering so manual tests still work.
    if (!found && nums.length === 2) {
      const num1 = nums[0];
      const num2 = nums[1];

      const isNum1Lat = num1 >= 55.0 && num1 <= 62.0;
      const isNum2Lon = num2 >= 19.0 && num2 <= 30.0;

      const isNum2Lat = num2 >= 55.0 && num2 <= 62.0;
      const isNum1Lon = num1 >= 19.0 && num1 <= 30.0;

      if (isNum1Lat && isNum2Lon) {
        lat = num1;
        lon = num2;
        const projected = wgs84ToLest97(lat, lon);
        x = projected.x;
        y = projected.y;
        found = true;
      } else if (isNum2Lat && isNum1Lon) {
        lat = num2;
        lon = num1;
        const projected = wgs84ToLest97(lat, lon);
        x = projected.x;
        y = projected.y;
        found = true;
      } else {
        // Fallback to L-EST97 magnitude heuristic
        if (Math.abs(num1) > Math.abs(num2)) {
          x = num1;
          y = num2;
        } else {
          x = num2;
          y = num1;
        }
        const wgs = lest97ToWgs84(x, y);
        lat = wgs.lat;
        lon = wgs.lon;
        found = true;
      }
    }

    // Accept point if a valid pair was extracted
    if (found) {
      parsedPoints.push({
        id: generateId(),
        x,
        y,
        lat,
        lon
      });
    }
  }

  return parsedPoints;
}
