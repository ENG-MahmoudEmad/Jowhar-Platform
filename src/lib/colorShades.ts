// src/lib/colorShades.ts
//
// بيولّد 7 درجات (غامق → فاتح) من لون العضو الأساسي، تُستخدم لتلوين
// bars الكاليندر حسب ترتيب التاسك بين تاسكات نفس العضو (الأقدم بداية = درجة
// أغمق). بعد الدرجة السابعة، بيرجع يلف من الأول (index % 7).

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  const d = max - min;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SHADE_COUNT = 7;
// من الأغمق للأفتح — index 0 هو الأغمق (أول تاسك بداية).
const LIGHTNESS_STEPS = [30, 38, 46, 54, 62, 70, 78];
const MIN_SATURATION = 35; // عشان الألوان الباهتة كتير تضل مميزة عن بعضها

/**
 * بيولّد درجة اللون رقم `index` (0-based) من لون العضو `baseColor`.
 * `index` = ترتيب التاسك بين كل تاسكات نفس العضو، مرتبة بتاريخ البداية
 * (الأقدم = 0). بعد index=6 بيرجع يلف (index % 7 متكفّل فيها المستدعي).
 */
export function getMemberTaskShade(baseColor: string, index: number): string {
  const { h, s } = hexToHsl(baseColor);
  const lightness = LIGHTNESS_STEPS[((index % SHADE_COUNT) + SHADE_COUNT) % SHADE_COUNT];
  const saturation = Math.max(s, MIN_SATURATION);
  return hslToHex(h, saturation, lightness);
}