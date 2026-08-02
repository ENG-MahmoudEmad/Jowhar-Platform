// src/lib/color.ts
// تحويل لون العضو (hex بالداتابيز) لـ HSL.
// ⚠️ `DiamondGem.tsx` فيه نسخة داخلية اسمها `hexToHue()` — الأنظف يستوردها
// من هون بدلها، عشان ما يصير لونين مختلفين لنفس العضو بمكانين.

export type Hsl = { hue: number; sat: number; light: number };

export function hexToHsl(hex: string): Hsl {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const light = (max + min) / 2;

  if (delta === 0) return { hue: 0, sat: 0, light: Math.round(light * 100) };

  const sat = delta / (1 - Math.abs(2 * light - 1));

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return { hue, sat: Math.round(sat * 100), light: Math.round(light * 100) };
}