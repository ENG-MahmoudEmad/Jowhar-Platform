// src/components/dashboard/profile/ImageColorPicker.tsx
"use client"

import React, { memo, useCallback, useRef, useState } from 'react'
import { Crosshair, X } from 'lucide-react'
import { useLang } from '@/context/LangContext'

/**
 * التقاط لون من صورة العضو نفسها.
 *
 * ليش موجود مع إن `window.EyeDropper` موجودة: الـ API الأصلية بتجمّد
 * المتصفح كامل وهي مفتوحة (طبقة التقاط على مستوى النظام)، فما بتقدر
 * تسكرول لصورة العضو فوق الصفحة. وكمان مدعومة بـ Chrome/Edge على
 * الديسكتوب فقط — الجوال بلا أي طريقة التقاط.
 *
 * الحل: عيّنة صغيرة من الصورة هون بالقسم نفسه، والقراءة من `canvas`.
 * مدعوم بكل المتصفحات والجوال.
 */

const SIZE = 64;

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function ImageColorPicker({
  imageUrl,
  onPick,
  isDark,
}: {
  imageUrl: string | null;
  onPick: (hex: string) => void;
  isDark: boolean;
}) {
  const { lang } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const arabicFont = lang === 'ar' ? 'var(--font-arabic)' : 'inherit';

  const tx = {
    pickFromPhoto: lang === 'ar' ? 'التقط من الصورة' : 'Pick from photo',
    tapToPick:     lang === 'ar' ? 'اضغط على أي نقطة' : 'Tap any spot',
    noPhoto:       lang === 'ar' ? 'لا توجد صورة'     : 'No photo',
    cancel:        lang === 'ar' ? 'إلغاء'            : 'Cancel',
  };

  /*
    crossOrigin إلزامي: بدونه المتصفح بيلوّث الـ canvas وبيرمي
    SecurityError عند `getImageData`. الـ bucket عام فالطلب بيمر.
  */
  const drawImage = useCallback(() => {
    if (!imageUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // قص مربّع من النص عشان الصورة ما تتشوّه
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;
  }, [imageUrl]);

  React.useEffect(() => {
    setReady(false);
    drawImage();
  }, [drawImage]);

  const colorAt = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((clientY - rect.top) / rect.height) * SIZE);

    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    try {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return toHex(r, g, b);
    } catch {
      // canvas ملوّث — الصورة من مصدر ما بيسمح بـ CORS
      return null;
    }
  }, []);

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active) return;
    setHover(colorAt(e.clientX, e.clientY));
  }, [active, colorAt]);

  const handlePick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hex = colorAt(e.clientX, e.clientY);
    if (hex) {
      onPick(hex);
      setActive(false);
      setHover(null);
    }
  }, [colorAt, onPick]);

  /*
    الجوال: نفرّق بين السحب والضغط بالمسافة. أقل من 10px = ضغطة
    مقصودة، أكتر = المستخدم بيسكرول والصفحة لازم تتحرك عادي.
  */
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const moved = Math.hypot(t.clientX - start.x, t.clientY - start.y);
    if (moved > 10) return; // سكرول مش ضغطة

    const hex = colorAt(t.clientX, t.clientY);
    if (hex) {
      onPick(hex);
      setActive(false);
    }
  }, [colorAt, onPick]);

  if (!imageUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{
          width: SIZE, height: SIZE,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
        }}
      >
        <span className="text-[8px] font-bold text-center px-1"
          style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
          {tx.noPhoto}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onClick={handlePick}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="rounded-xl"
          style={{
            width: SIZE, height: SIZE,
            cursor: active ? 'crosshair' : 'pointer',
            border: `2px solid ${active ? '#458482' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)')}`,
            // بيضل السكرول شغال على الجوال — التمييز بالمسافة مش بالمنع
            touchAction: 'auto',
            opacity: ready ? 1 : 0.4,
          }}
        />

        {!active && (
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={tx.pickFromPhoto}
            title={tx.pickFromPhoto}
            className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: '#458482', color: '#fff', border: '2px solid var(--card)' }}
          >
            <Crosshair className="w-3 h-3" />
          </button>
        )}
      </div>

      {active && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold" style={{ color: '#458482', fontFamily: arabicFont }}>
            {tx.tapToPick}
          </span>
          {hover && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded" style={{ background: hover }} />
              <span className="text-[9px] font-medium" style={{ fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>
                {hover.toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setActive(false); setHover(null); }}
            className="flex items-center gap-1 text-[9px] font-bold cursor-pointer"
            style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}
          >
            <X className="w-2.5 h-2.5" /> {tx.cancel}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(ImageColorPicker);