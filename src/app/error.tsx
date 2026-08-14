"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Undo2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useLang } from '@/context/LangContext' // عدّل المسار حسب مكان الـ context عندك

interface Particle {
  tx: number
  ty: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  c: string
  phase: number
  breathe: number
}

const COPY = {
  en: {
    dir: 'ltr' as const,
    font: 'Georgia, serif',
    subtitle: 'render failed',
    error: '— error: exception in pipeline —',
    frameA: 'the ',
    frameB: 'render',
    frameC: ' crashed unexpectedly',
    retry: 'retry render',
    back: 'back to project',
    studio: 'JOWHAR STUDIO',
    corrupted: 'Pipeline Crashed',
    hint: 'interact to reveal the fragments',
    digest: 'ref',
  },
  ar: {
    dir: 'rtl' as const,
    font: 'var(--font-arabic), Cairo, sans-serif',
    subtitle: 'فشل في العرض',
    error: '— خطأ: استثناء في المعالجة —',
    frameA: 'حدث ',
    frameB: 'عطل',
    frameC: ' غير متوقع أثناء العرض',
    retry: 'إعادة المحاولة',
    back: 'العودة للمشروع',
    studio: 'استوديو جوهر',
    corrupted: 'انهيار في المعالجة',
    hint: 'تفاعل لكشف الشظايا',
    digest: 'مرجع',
  },
}

// ── بناء الجزيئات: تكبير كلمة ERR ورفعها للأعلى ──
function buildParticles(W: number, H: number, CX: number, CY: number, subtitle: string): Particle[] {
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const oc = off.getContext('2d')!

  const fs = W < 400 ? 90 : W < 640 ? 120 : W < 1024 ? 180 : 240
  const yOffset = W < 640 ? 60 : 100

  oc.font = `900 ${fs}px Georgia, serif`
  oc.fillStyle = 'white'
  oc.textAlign = 'center'
  oc.textBaseline = 'middle'
  oc.fillText('ERR', CX, CY - yOffset)

  oc.font = `400 ${W < 640 ? 11 : 15}px monospace`
  oc.fillStyle = 'rgba(255,255,255,0.6)'
  oc.fillText(subtitle, CX, CY + fs / 5)

  const data = oc.getImageData(0, 0, W, H).data
  const pts: Particle[] = []

  const totalPixels = W * H
  const step = totalPixels > 1_800_000 ? 6 : totalPixels > 600_000 ? 5 : 4

  for (let x = 0; x < W; x += step) {
    for (let y = 0; y < H; y += step) {
      if (data[(y * W + x) * 4 + 3] > 100) {
        const isSub = y > CY + 20
        const scatter = isSub ? 40 : 100

        pts.push({
          tx: x,
          ty: y,
          x: x + (Math.random() - 0.5) * scatter,
          y: y + (Math.random() - 0.5) * scatter,
          vx: 0,
          vy: 0,
          r: isSub ? 1 : Math.random() < 0.25 ? 2.2 : 1.5,
          // ألوان أميل للتحذير (برتقالي/أحمر خفيف) بدل الأخضر الافتراضي، لتمييزها عن 404
          c: isSub
            ? Math.random() < 0.5 ? 'rgba(217,129,94,0.4)' : 'rgba(255,255,255,0.2)'
            : Math.random() < 0.35 ? '#d9815e' : Math.random() < 0.6 ? '#c14f4f' : 'rgba(255,255,255,0.7)',
          phase: Math.random() * Math.PI * 2,
          breathe: 0.3 + Math.random() * 0.7,
        })
      }
    }
  }

  const MAX_PARTICLES = 6000
  if (pts.length > MAX_PARTICLES) {
    const ratio = MAX_PARTICLES / pts.length
    return pts.filter(() => Math.random() < ratio)
  }
  return pts
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { lang } = useLang() // عدّل حسب الـ hook الفعلي عندك
  const t = COPY[lang === 'ar' ? 'ar' : 'en']

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const ptsRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -999, y: -999, lx: 0, ly: 0 })
  const animRef = useRef<number>(0)
  const [particleCount, setParticleCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  // تسجيل الخطأ فعلياً — استبدل بأي أداة monitoring عندك (Sentry مثلاً) لاحقاً
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const ctx = canvas.getContext('2d')!
    let t = 0
    const REPEL_R = 110
    const REPEL_STR = 3.5

    const updateSize = () => {
      const W = root.offsetWidth
      const H = root.offsetHeight
      canvas.width = W
      canvas.height = H
      const pts = buildParticles(W, H, W / 2, H / 2, COPY[lang === 'ar' ? 'ar' : 'en'].subtitle)
      ptsRef.current = pts
      setParticleCount(pts.length)
      setReady(true)
    }

    updateSize()

    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(updateSize, 200)
    }
    window.addEventListener('resize', onResize)

    function draw() {
      const W = canvas!.width
      const H = canvas!.height
      t += 0.012

      ctx.fillStyle = '#070608'
      ctx.fillRect(0, 0, W, H)

      const m = mouseRef.current
      m.lx += (m.x - m.lx) * 0.08
      m.ly += (m.y - m.ly) * 0.08

      ptsRef.current.forEach(p => {
        const dx = p.tx - p.x
        const dy = p.ty - p.y

        let ax = dx * 0.035
        let ay = dy * 0.035

        if (m.x > 0) {
          const mdx = m.lx - p.x
          const mdy = m.ly - p.y
          const md = Math.sqrt(mdx * mdx + mdy * mdy)
          if (md < REPEL_R && md > 0) {
            const force = REPEL_STR * (1 - md / REPEL_R)
            ax -= (mdx / md) * force
            ay -= (mdy / md) * force
          }
        }

        ax += Math.sin(t * 0.5 + p.phase) * 0.035 * p.breathe
        ay += Math.cos(t * 0.4 + p.phase) * 0.035 * p.breathe

        p.vx = (p.vx + ax) * 0.78
        p.vy = (p.vy + ay) * 0.78
        p.x += p.vx
        p.y += p.vy

        const speed2 = p.vx * p.vx + p.vy * p.vy
        const alpha = 0.45 + Math.min(speed2 * 0.35, 0.5)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.c
        ctx.fill()
      })

      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimer)
    }
  }, [lang])

  const handlePointerMove = (clientX: number, clientY: number) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    mouseRef.current.x = clientX - r.left
    mouseRef.current.y = clientY - r.top
  }

  return (
    <div
      ref={rootRef}
      dir={t.dir}
      onMouseMove={(e) => !isTouch && handlePointerMove(e.clientX, e.clientY)}
      onMouseLeave={() => {
        mouseRef.current.x = -999
        mouseRef.current.y = -999
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0]
        if (touch) handlePointerMove(touch.clientX, touch.clientY)
      }}
      onTouchEnd={() => {
        mouseRef.current.x = -999
        mouseRef.current.y = -999
      }}
      className="relative h-screen w-full overflow-hidden bg-[#070608] cursor-crosshair select-none font-mono"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Top UI */}
      <div
        className={`absolute top-4 sm:top-8 ${t.dir === 'rtl' ? 'right-4 sm:right-8 border-r' : 'left-4 sm:left-8 border-l'} text-[9px] sm:text-[10px] text-white/20 font-mono ${t.dir === 'rtl' ? 'border-[#d9815e]/30 pr-3 sm:pr-4' : 'border-[#d9815e]/30 pl-3 sm:pl-4'} space-y-1 hidden md:block z-10`}
      >
        <p>// SCENE_ID: 0x500</p>
        <p>// NODES: {particleCount}</p>
        <p>// STATUS: {ready ? 'FAULTED' : 'LOADING'}</p>
        {error.digest && <p>// {t.digest}: {error.digest.slice(0, 8)}</p>}
      </div>

      <div
        className={`absolute top-4 sm:top-8 ${t.dir === 'rtl' ? 'left-4 sm:left-8 text-left' : 'right-4 sm:right-8 text-right'} text-[9px] sm:text-[10px] text-white/20 font-mono z-10 hidden md:block uppercase tracking-[0.2em]`}
      >
        <p>{t.studio}</p>
        <p className="opacity-40">{t.corrupted}</p>
      </div>

      {/* Bottom UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 sm:pb-24 md:pb-32 px-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <AlertTriangle size={12} className="text-[#d9815e]/70" />
          <p className="text-[9px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em] text-[#d9815e]/70 font-mono uppercase text-center">
            {t.error}
          </p>
        </div>
        <h2
          className="text-[15px] sm:text-[18px] md:text-[22px] font-light text-white/70 italic tracking-wide mb-6 sm:mb-8 md:mb-10 text-center max-w-[90vw] leading-relaxed"
          style={{ fontFamily: t.font }}
        >
          {t.frameA}
          <span className="text-[#d9815e] not-italic font-bold">{t.frameB}</span>
          {t.frameC}
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full sm:w-auto pointer-events-auto px-4 sm:px-0">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-3 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase px-6 sm:px-10 py-3.5 sm:py-4 bg-[#458482]/10 text-[#458482] border border-[#458482]/30 hover:bg-[#458482] hover:text-black active:bg-[#458482] active:text-black transition-all duration-300 font-bold"
          >
            <RotateCcw size={14} /> {t.retry}
          </button>
          <Link href="/" className="w-full sm:w-auto">
            <button className="w-full flex items-center justify-center gap-3 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase px-6 sm:px-10 py-3.5 sm:py-4 bg-transparent text-white/20 border border-white/10 hover:border-[#d9815e] hover:text-[#d9815e] active:border-[#d9815e] active:text-[#d9815e] transition-all duration-300">
              <Undo2 size={14} /> {t.back}
            </button>
          </Link>
        </div>
      </div>

      <p className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] text-white/10 font-mono tracking-[0.4em] sm:tracking-[0.6em] z-10 uppercase hidden sm:block">
        {t.hint}
      </p>
    </div>
  )
}