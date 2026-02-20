interface Paint {
  id: string;
  brand: string;
  name: string;
  type: string;
  color_hex: string;
}

interface PaintMatch {
  paint: Paint;
  distance: number;
  percentage: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate color distance using Euclidean distance in RGB space
 * For more accuracy, could use Delta E (CIE76, CIE94, or CIEDE2000)
 */
function calculateColorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Find paints that match a given color
 * @param targetColor - Hex color to match
 * @param paints - Array of all available paints
 * @param limit - Number of matches to return
 * @param brandFilter - Optional brand filter
 */
export function findMatchingPaints(
  targetColor: string,
  paints: Paint[],
  limit: number = 10,
  brandFilter?: string
): PaintMatch[] {
  // Filter by brand if specified
  const filteredPaints = brandFilter ? paints.filter((p) => p.brand === brandFilter) : paints;

  // Calculate distances
  const matches = filteredPaints.map((paint) => {
    const distance = calculateColorDistance(targetColor, paint.color_hex);
    // Convert distance to percentage (0 = perfect match, 441.67 = maximum RGB distance)
    const percentage = Math.max(0, 100 - (distance / 441.67) * 100);
    return { paint, distance, percentage };
  });

  // Sort by distance (lower is better) and return top matches
  return matches.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/**
 * Convert RGB to Lab color space for Delta E calculation (more accurate)
 * Reference: http://www.easyrgb.com/en/math.php
 */
function rgbToLab(r: number, g: number, blue: number): { l: number; a: number; b: number } {
  // Convert RGB to XYZ
  let varR = r / 255;
  let varG = g / 255;
  let varB = blue / 255;

  varR = varR > 0.04045 ? Math.pow((varR + 0.055) / 1.055, 2.4) : varR / 12.92;
  varG = varG > 0.04045 ? Math.pow((varG + 0.055) / 1.055, 2.4) : varG / 12.92;
  varB = varB > 0.04045 ? Math.pow((varB + 0.055) / 1.055, 2.4) : varB / 12.92;

  varR *= 100;
  varG *= 100;
  varB *= 100;

  const x = varR * 0.4124 + varG * 0.3576 + varB * 0.1805;
  const y = varR * 0.2126 + varG * 0.7152 + varB * 0.0722;
  const z = varR * 0.0193 + varG * 0.1192 + varB * 0.9505;

  // Convert XYZ to Lab
  let varX = x / 95.047;
  let varY = y / 100.0;
  let varZ = z / 108.883;

  varX = varX > 0.008856 ? Math.pow(varX, 1 / 3) : 7.787 * varX + 16 / 116;
  varY = varY > 0.008856 ? Math.pow(varY, 1 / 3) : 7.787 * varY + 16 / 116;
  varZ = varZ > 0.008856 ? Math.pow(varZ, 1 / 3) : 7.787 * varZ + 16 / 116;

  const l = 116 * varY - 16;
  const a = 500 * (varX - varY);
  const b = 200 * (varY - varZ);

  return { l, a, b };
}

/**
 * Calculate Delta E (CIE76) - more perceptually accurate than RGB distance
 */
export function calculateDeltaE(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);

  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Find matching paints using Delta E (more accurate)
 */
export function findMatchingPaintsDeltaE(
  targetColor: string,
  paints: Paint[],
  limit: number = 10,
  brandFilter?: string
): PaintMatch[] {
  const filteredPaints = brandFilter ? paints.filter((p) => p.brand === brandFilter) : paints;

  const matches = filteredPaints.map((paint) => {
    const distance = calculateDeltaE(targetColor, paint.color_hex);
    // Delta E: 0 = perfect match, <2 = imperceptible, <10 = good match
    const percentage = Math.max(0, 100 - (distance / 100) * 100);
    return { paint, distance, percentage };
  });

  return matches.sort((a, b) => a.distance - b.distance).slice(0, limit);
}
