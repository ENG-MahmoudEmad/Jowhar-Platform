"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Undo2, Zap, Box } from 'lucide-react'

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

// ── بناء الجزيئات: تكبير الرقم 404 ورفعه للأعلى ──
function buildParticles(W: number, H: number, CX: number, CY: number): Particle[] {
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const oc = off.getContext('2d')!

  // كبرنا الخط لـ 280 (ضخم) و 160 للموبايل
  const fs = W < 500 ? 160 : 280
  oc.font = `900 ${fs}px Georgia, serif`
  oc.fillStyle = 'white'
  oc.textAlign = 'center'
  oc.textBaseline = 'middle'
  
  // رفعنا الرقم لـ (CY - 100) ليعطي مساحة للأزرار تحت
  oc.fillText('404', CX, CY - 100)

  oc.font = `400 15px monospace`
  oc.fillStyle = 'rgba(255,255,255,0.6)'
  oc.fillText('page not found', CX, CY + fs / 5)

  const data = oc.getImageData(0, 0, W, H).data
  const pts: Particle[] = []
  const step = 5 // لو في تعليق بالجهاز ارفعها لـ 6

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
          c: isSub
            ? Math.random() < 0.5 ? 'rgba(69,132,130,0.4)' : 'rgba(255,255,255,0.2)'
            : Math.random() < 0.3 ? '#d9815e' : Math.random() < 0.6 ? '#458482' : 'rgba(255,255,255,0.7)',
          phase: Math.random() * Math.PI * 2,
          breathe: 0.3 + Math.random() * 0.7,
        })
      }
    }
  }
  return pts
}

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const ptsRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -999, y: -999, lx: 0, ly: 0 })
  const animRef = useRef<number>(0)
  const [particleCount, setParticleCount] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const ctx = canvas.getContext('2d')!
    let t = 0
    const REPEL_R = 110 // تكبير دائرة التأثير قليلاً لتناسب حجم الرقم
    const REPEL_STR = 3.5

    const updateSize = () => {
      const W = root.offsetWidth
      const H = root.offsetHeight
      canvas.width = W
      canvas.height = H
      const pts = buildParticles(W, H, W / 2, H / 2)
      ptsRef.current = pts
      setParticleCount(pts.length)
      setReady(true)
    }

    updateSize()
    window.addEventListener('resize', updateSize)

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
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mouseRef.current.x = e.clientX - r.left
        mouseRef.current.y = e.clientY - r.top
      }}
      onMouseLeave={() => {
        mouseRef.current.x = -999
        mouseRef.current.y = -999
      }}
      className="relative h-screen w-full overflow-hidden bg-[#070608] cursor-crosshair select-none font-mono"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Top UI */}
      <div className="absolute top-8 left-8 text-[10px] text-white/20 font-mono border-l border-[#458482]/30 pl-4 space-y-1 hidden lg:block z-10">
        <p>// SCENE_ID: 0x404</p>
        <p>// NODES: {particleCount}</p>
        <p>// STATUS: {ready ? 'READY' : 'LOADING'}</p>
      </div>

      <div className="absolute top-8 right-8 text-[10px] text-white/20 font-mono text-right z-10 hidden lg:block uppercase tracking-[0.2em]">
        <p>JOWHAR STUDIO</p>
        <p className="opacity-40">Timeline Corrupted</p>
      </div>

      {/* Bottom UI - مرفوع للأعلى بـ pb-32 */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 z-10 pointer-events-none">
        <p className="text-[11px] tracking-[0.4em] text-[#458482]/60 font-mono mb-4 uppercase">
          — error: sequence interrupted —
        </p>
        <h2 className="text-[22px] font-light text-white/70 italic tracking-wide mb-10" style={{ fontFamily: 'Georgia, serif' }}>
          the current <span className="text-[#458482] not-italic font-bold">frame</span> is missing from the render
        </h2>

        <div className="flex gap-5 pointer-events-auto">
          <Link href="/">
            <button className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase px-10 py-4 bg-[#458482]/10 text-[#458482] border border-[#458482]/30 hover:bg-[#458482] hover:text-black transition-all duration-300 font-bold">
              <Undo2 size={14} /> back to project
            </button>
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase px-10 py-4 bg-transparent text-white/20 border border-white/10 hover:border-[#d9815e] hover:text-[#d9815e] transition-all duration-300"
          >
            <Zap size={14} /> re-render
          </button>
        </div>
      </div>

      {/* الأيقونة الجانبية */}
      <div className="absolute bottom-8 right-8 opacity-20 z-10">
        <Box size={24} className="text-[#458482]" />
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-white/10 font-mono tracking-[0.6em] z-10 uppercase">
        interact to reveal the fragments
      </p>
    </div>
  )
}