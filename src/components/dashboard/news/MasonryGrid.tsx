// src/components/dashboard/news/MasonryGrid.tsx
"use client"

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

interface MasonryItem {
  key:  string
  node: React.ReactNode
}

interface MasonryGridProps {
  items:      MasonryItem[]
  gap?:       number
  className?: string
}

type LayoutMap = Map<string, { x: number; y: number; width: number }>

/**
 * Pinterest-style masonry: كل عمود بيمتلي بإحكام (بلا فراغات)، وكل عنصر
 * جديد بينحط بـ**أقصر عمود حاليًا** بدل ما يملي عمود كامل قبل ما ينتقل
 * للتالي — فالنتيجة قريبة جدًا من ترتيب صف-صف الطبيعي.
 *
 * ⚠️ قياس منفصل تمامًا عن العرض (وليس "نفس الكارت بعرض مؤقت ثم ينتقل"):
 * - طبقة قياس مخفية بالكامل برّا حدود الشاشة (left: -99999px، مش
 *   opacity: 0) — بيانها الوحيد المستخدَم هو الارتفاع الفعلي المحسوب،
 *   والمستخدم ما بيشوفها أبدًا مهما صار (ولا حتى ومضة إطار وحد).
 * - الطبقة الحقيقية: كل كارت بينضاف للـDOM **أول مرة وهو أصلاً بموضعه
 *   وعرضه النهائيين 100%** (بعد ما القياس خلص) — صفر قفزة موضع/عرض.
 *   أنيميشن الدخول (fade/slide) مسؤولية الكومبوننت المستدعي (Framer
 *   Motion على NewsPostItem مثلاً)، مش MasonryGrid نفسها.
 */
export default function MasonryGrid({ items, gap = 16, className }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const heightsRef = useRef<Map<string, number>>(new Map())
  const roMapRef = useRef<Map<string, ResizeObserver>>(new Map())

  const [columnCount, setColumnCount] = useState(1)
  const [layout, setLayout] = useState<LayoutMap>(new Map())
  const [containerHeight, setContainerHeight] = useState(0)
  // بس عشان نجبر useMemo(measureWidth) يعيد الحساب لما عرض الحاوية يتغيّر
  const [containerWidthTick, setContainerWidthTick] = useState(0)

  const computeColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return 1
    const w = window.innerWidth
    if (w >= 1280) return 3
    if (w >= 768) return 2
    return 1
  }, [])

  useLayoutEffect(() => {
    setColumnCount(computeColumnCount())
    const onResize = () => setColumnCount(computeColumnCount())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [computeColumnCount])

  const recompute = useCallback(() => {
    const container = containerRef.current
    if (!container || columnCount === 0 || items.length === 0) {
      setLayout(new Map())
      setContainerHeight(0)
      return
    }

    const containerWidth = container.offsetWidth
    if (containerWidth === 0) return

    const colWidth = (containerWidth - gap * (columnCount - 1)) / columnCount
    const colHeights = new Array(columnCount).fill(0)
    const nextLayout: LayoutMap = new Map()

    for (const item of items) {
      const height = heightsRef.current.get(item.key)
      // لسا مو كل العناصر انقاست — منستنى لحد ما تكتمل القياسات كلها
      if (height === undefined) return

      let minCol = 0
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < colHeights[minCol]) minCol = i
      }

      nextLayout.set(item.key, {
        x: minCol * (colWidth + gap),
        y: colHeights[minCol],
        width: colWidth,
      })
      colHeights[minCol] = colHeights[minCol] + height + gap
    }

    setLayout(nextLayout)
    setContainerHeight(Math.max(0, ...colHeights) - gap)
  }, [items, columnCount, gap])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      setContainerWidthTick((t) => t + 1)
      recompute()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [recompute])

  useLayoutEffect(() => {
    recompute()
  }, [recompute])

  // عرض عمود القياس — نفس منطق الأعمدة الحقيقية، بس بيُستخدم للطبقة
  // المخفية بس (عشان نص الكارت يلتف صح ويعطي ارتفاع صحيح).
  const measureWidth = useMemo(() => {
    const container = containerRef.current
    const containerWidth = container?.offsetWidth ?? 0
    if (!containerWidth || columnCount === 0) return 320 // تقدير أولي معقول لحد ما الحاوية توجد فعليًا
    return (containerWidth - gap * (columnCount - 1)) / columnCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnCount, gap, containerWidthTick])

  const registerItemEl = useCallback((key: string, el: HTMLDivElement | null) => {
    const existingRo = roMapRef.current.get(key)
    if (existingRo) {
      existingRo.disconnect()
      roMapRef.current.delete(key)
    }
    if (!el) {
      heightsRef.current.delete(key)
      return
    }

    heightsRef.current.set(key, el.offsetHeight)

    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height
      if (heightsRef.current.get(key) !== h) {
        heightsRef.current.set(key, h)
        recompute()
      }
    })
    ro.observe(el)
    roMapRef.current.set(key, ro)
  }, [recompute])

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', height: containerHeight || undefined }}>
      {/* طبقة القياس — دايمًا موجودة، برّا حدود الشاشة تمامًا (left:
          -99999px). ما إلها أي وجود بصري مهما صار، فمافي أي احتمال
          "ومضة" أو ظهور مؤقت غلط. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: -99999, visibility: 'hidden', pointerEvents: 'none' }}
      >
        {items.map((item) => (
          <div key={item.key} ref={(el) => registerItemEl(item.key, el)} style={{ width: measureWidth }}>
            {item.node}
          </div>
        ))}
      </div>

      {/* الطبقة الحقيقية — كل كارت بينضاف للـDOM أول مرة وهو أصلاً بموضعه
          وعرضه النهائيين (من layout المحسوب) — صفر قفزة. أنيميشن الدخول
          (fade/slide) مسؤولية الكومبوننت الأب (NewsPostItem)، مش هون. */}
      {items
        .filter((item) => layout.has(item.key))
        .map((item) => {
          const pos = layout.get(item.key)!
          return (
            <div
              key={item.key}
              style={{
                position: 'absolute',
                top: pos.y,
                left: pos.x,
                width: pos.width,
                transition: 'top 0.18s ease, left 0.18s ease',
              }}
            >
              {item.node}
            </div>
          )
        })}
    </div>
  )
}