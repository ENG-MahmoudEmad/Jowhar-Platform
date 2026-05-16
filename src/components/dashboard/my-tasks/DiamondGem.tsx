"use client";

import { useEffect, useRef } from "react";

interface DiamondGemProps {
  /** HSL hue 0-360 — controls the gem colour */
  hue: number;
  /** HSL saturation 0-100 (default 40) */
  sat?: number;
  /** Canvas render size in px (default 160) */
  size?: number;
  /** Float animation phase offset in seconds (default 0) */
  floatDelay?: number;
  /** Light mode = brighter/lighter facets, dark mode = richer deeper tones */
  isDark?: boolean;
  /** Extra className for the wrapper div */
  className?: string;
}

// ─── Core draw function (pure, no React deps) ────────────────────────────────
function drawDiamond(
  canvas: HTMLCanvasElement,
  hue: number,
  sat: number,
  mx: number,
  my: number,
  isDark = true
) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;

  // Key geometry — classic brilliant-cut silhouette
  const tableL  = cx - W * 0.22;
  const tableR  = cx + W * 0.22;
  const tableY  = H * 0.08;
  const crownL  = cx - W * 0.44;
  const crownR  = cx + W * 0.44;
  const girdleY = H * 0.38;
  const tipX    = cx;
  const tipY    = H * 0.92;

  const hsl = (h: number, s: number, l: number, a = 1) =>
    `hsla(${h},${s}%,${l}%,${a})`;

  // Light mode lifts all lightness values; dark mode keeps them rich & deep
  const lo = isDark ? 0 : 18;   // lightness offset (+18 in light mode)

  // Mouse-driven light direction (-1..1)
  const nx = (mx / W) * 2 - 1;
  const ny = (my / H) * 2 - 1;
  const lx = 0.3 + nx * 0.25;
  const ly = 0.2 + ny * 0.15;

  const facetBrightness = (fnx: number, fny: number) =>
    0.5 + (fnx * lx + fny * ly) * 0.5;

  // ── Clip to outline ───────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tableL, tableY);
  ctx.lineTo(tableR, tableY);
  ctx.lineTo(crownR, girdleY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(crownL, girdleY);
  ctx.closePath();
  ctx.clip();

  // ── Base gradient ─────────────────────────────────────────────────────────
  const baseGrad = ctx.createLinearGradient(crownL, tableY, crownR, tipY);
  baseGrad.addColorStop(0,    hsl(hue, sat, 82 + lo));
  baseGrad.addColorStop(0.35, hsl(hue, sat, 68 + lo));
  baseGrad.addColorStop(0.65, hsl(hue, sat, 55 + lo));
  baseGrad.addColorStop(1,    hsl(hue, sat, 42 + lo));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Table (flat top) ──────────────────────────────────────────────────────
  {
    const b   = facetBrightness(0, -1) * (0.85 + lx * 0.15);
    const icL = cx - W * 0.10;
    const icR = cx + W * 0.10;
    const icY = girdleY * 0.52;
    const g   = ctx.createLinearGradient(tableL, tableY, tableR, tableY + 4);
    g.addColorStop(0, hsl(hue, sat * 0.6, Math.min(98, 88 * b + lo)));
    g.addColorStop(1, hsl(hue, sat * 0.6, Math.min(97, 78 * b + lo)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tableL, tableY);
    ctx.lineTo(tableR, tableY);
    ctx.lineTo(icR, icY);
    ctx.lineTo(icL, icY);
    ctx.closePath();
    ctx.fill();
  }

  // ── Crown facets ──────────────────────────────────────────────────────────
  type FacetDef = { pts: [number, number][]; nx: number; ny: number };
  const crownFacets: FacetDef[] = [
    { pts: [[tableL, tableY],[cx - W*0.10, girdleY*0.52],[crownL, girdleY]],                                       nx:-0.7, ny:-0.3 },
    { pts: [[tableL, tableY],[cx - W*0.10, girdleY*0.52],[cx, girdleY*0.44]],                                      nx:-0.2, ny:-0.5 },
    { pts: [[tableR, tableY],[cx + W*0.10, girdleY*0.52],[cx, girdleY*0.44]],                                      nx: 0.2, ny:-0.5 },
    { pts: [[tableR, tableY],[cx + W*0.10, girdleY*0.52],[crownR, girdleY]],                                       nx: 0.7, ny:-0.3 },
    { pts: [[crownL, girdleY],[cx - W*0.10, girdleY*0.52],[cx, girdleY*0.44],[cx - W*0.30, girdleY]],             nx:-0.6, ny: 0.1 },
    { pts: [[crownR, girdleY],[cx + W*0.10, girdleY*0.52],[cx, girdleY*0.44],[cx + W*0.30, girdleY]],             nx: 0.6, ny: 0.1 },
    { pts: [[cx - W*0.10, girdleY*0.52],[cx + W*0.10, girdleY*0.52],[cx + W*0.30, girdleY],[cx - W*0.30, girdleY]], nx: 0,  ny:-0.2 },
  ];

  crownFacets.forEach(({ pts, nx: fnx, ny: fny }) => {
    const b = facetBrightness(fnx, fny);
    const l = Math.max(30, Math.min(97, 70 * b + (1 - lx) * 8 + lo));
    ctx.fillStyle = hsl(hue, sat * 0.8, l, isDark ? 0.88 : 0.82);
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
  });

  // ── Pavilion facets ───────────────────────────────────────────────────────
  const pavFacets: FacetDef[] = [
    { pts: [[crownL, girdleY],[cx - W*0.30, girdleY],[tipX, tipY]],                      nx:-0.9, ny:0.4 },
    { pts: [[cx - W*0.30, girdleY],[cx, girdleY*0.62],[tipX, tipY]],                     nx:-0.4, ny:0.6 },
    { pts: [[cx - W*0.30, girdleY],[cx + W*0.30, girdleY],[cx, girdleY*0.62]],           nx: 0,   ny:0.2 },
    { pts: [[cx + W*0.30, girdleY],[cx, girdleY*0.62],[tipX, tipY]],                     nx: 0.4, ny:0.6 },
    { pts: [[crownR, girdleY],[cx + W*0.30, girdleY],[tipX, tipY]],                      nx: 0.9, ny:0.4 },
    { pts: [[cx, girdleY*0.62],[cx - W*0.30, girdleY],[cx + W*0.30, girdleY]],           nx: 0,   ny:0.5 },
  ];

  pavFacets.forEach(({ pts, nx: fnx, ny: fny }) => {
    const b = facetBrightness(fnx, fny);
    const l = Math.max(25, Math.min(95, 58 * b + lo));
    ctx.fillStyle = hsl(hue, sat * 0.9, l, isDark ? 0.92 : 0.80);
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
  });

  // ── Shimmer highlights (track mouse) ─────────────────────────────────────
  const shimX = tableL + (tableR - tableL) * (0.3 + lx * 0.4);
  const shimY = tableY + (girdleY - tableY) * (0.15 + ly * 0.2);
  const sh1   = ctx.createRadialGradient(shimX, shimY, 1, shimX, shimY, W * 0.18);
  sh1.addColorStop(0,   hsl(hue, 20, 98, 0.75));
  sh1.addColorStop(0.4, hsl(hue, 30, 90, 0.25));
  sh1.addColorStop(1,   hsl(hue, 30, 80, 0));
  ctx.fillStyle = sh1;
  ctx.fillRect(0, 0, W, H);

  const s2x = cx + W * 0.18 - nx * W * 0.12;
  const s2y = girdleY * 0.7  - ny * 8;
  const sh2 = ctx.createRadialGradient(s2x, s2y, 0, s2x, s2y, W * 0.11);
  sh2.addColorStop(0, hsl(hue, 10, 97, 0.5));
  sh2.addColorStop(1, hsl(hue, 20, 85, 0));
  ctx.fillStyle = sh2;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();

  // ── Facet edge lines ──────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = hsl(hue, sat * 0.3, 95, 0.35);
  ctx.lineWidth   = 0.6;

  const lines: [[number,number],[number,number]][] = [
    [[tableL, tableY],[crownL, girdleY]],
    [[tableR, tableY],[crownR, girdleY]],
    [[tableL, tableY],[cx - W*0.30, girdleY]],
    [[tableR, tableY],[cx + W*0.30, girdleY]],
    [[tableL, tableY],[cx, girdleY*0.44]],
    [[tableR, tableY],[cx, girdleY*0.44]],
    [[cx - W*0.10, girdleY*0.52],[crownL, girdleY]],
    [[cx + W*0.10, girdleY*0.52],[crownR, girdleY]],
    [[cx - W*0.10, girdleY*0.52],[cx - W*0.30, girdleY]],
    [[cx + W*0.10, girdleY*0.52],[cx + W*0.30, girdleY]],
    [[cx, girdleY*0.44],[cx - W*0.30, girdleY]],
    [[cx, girdleY*0.44],[cx + W*0.30, girdleY]],
    [[crownL, girdleY],[crownR, girdleY]],
    [[crownL, girdleY],[tipX, tipY]],
    [[crownR, girdleY],[tipX, tipY]],
    [[cx - W*0.30, girdleY],[tipX, tipY]],
    [[cx + W*0.30, girdleY],[tipX, tipY]],
    [[cx, girdleY*0.62],[crownL, girdleY]],
    [[cx, girdleY*0.62],[crownR, girdleY]],
    [[cx, girdleY*0.62],[tipX, tipY]],
  ];

  lines.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  });

  // Outer silhouette border
  ctx.strokeStyle = hsl(hue, sat * 0.4, 85, 0.5);
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(tableL, tableY);
  ctx.lineTo(tableR, tableY);
  ctx.lineTo(crownR, girdleY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(crownL, girdleY);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  // ── Soft drop-glow ────────────────────────────────────────────────────────
  const glowY = girdleY + 8;
  const glow  = ctx.createRadialGradient(cx, glowY, 2, cx, glowY, W * 0.42);
  glow.addColorStop(0,   hsl(hue, sat, 45 + lo, isDark ? 0.3  : 0.15));
  glow.addColorStop(0.5, hsl(hue, sat, 45 + lo, isDark ? 0.12 : 0.06));
  glow.addColorStop(1,   hsl(hue, sat, 45 + lo, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

// ─── React Component ─────────────────────────────────────────────────────────
export default function DiamondGem({
  hue,
  sat = 40,
  size = 160,
  floatDelay = 0,
  isDark = true,
  className = "",
}: DiamondGemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const mouseRef  = useRef({ x: size / 2, y: size / 2, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let t = floatDelay;

    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    let smoothX = size / 2;
    let smoothY = size / 2;

    const tick = () => {
      t += 0.018;
      const floatY = Math.sin(t) * 7;
      canvas.style.transform = `translateY(${floatY}px)`;

      const { x, y, active } = mouseRef.current;
      const ease = active ? 0.08 : 0.04;
      const targetX = active ? x : size / 2;
      const targetY = active ? y : size / 2;
      smoothX += (targetX - smoothX) * ease;
      smoothY += (targetY - smoothY) * ease;

      drawDiamond(canvas, hue, sat, smoothX, smoothY, isDark);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [hue, sat, size, floatDelay, isDark]);

  return (
    <div
      className={className}
      style={{
        width:  size,
        height: size,
        filter: `drop-shadow(0 12px 24px hsla(${hue},${sat}%,40%,${isDark ? 0.4 : 0.2}))`,
        cursor: "crosshair",
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: "block" }}
      />
    </div>
  );
}