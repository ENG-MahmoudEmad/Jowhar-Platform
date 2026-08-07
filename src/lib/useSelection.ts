//src\lib\useSelection.ts
"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * Generic "Select" mode, matching the Google Drive pattern: a toggle turns
 * on checkboxes across the grid/list, tapping items adds/removes them from
 * the selection, and a contextual toolbar appears once something is picked.
 * Turning selection mode off always clears the selection — there's no
 * value in remembering a stale selection once the checkboxes disappear.
 *
 * Also supports drag-select (press on one item, drag across others without
 * releasing — same gesture Telegram uses for multi-selecting messages).
 * Pressing an item decides the drag's direction: pressing an unselected item
 * starts a "select" drag, pressing a selected one starts a "deselect" drag;
 * every other item the pointer passes over while still held down follows
 * that same direction. This needs no library — mousedown picks the
 * direction, mouseenter (while held) applies it, and a single window-level
 * mouseup/touchend ends the drag regardless of where the pointer is
 * released.
 */
export function useSelection() {
  const [active, setActive]           = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isDraggingRef = useRef(false)
  const dragDirectionRef = useRef<'select' | 'deselect'>('select')

  const enable = useCallback(() => setActive(true), [])

  const disable = useCallback(() => {
    setActive(false)
    setSelectedIds(new Set())
  }, [])

  const toggleMode = useCallback(() => {
    setActive(prev => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }, [])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  /** Press-down on an item: decides drag direction and applies it immediately
      to this item, then arms the drag so subsequent pointer-enters follow. */
  const startDrag = useCallback((id: string) => {
    isDraggingRef.current = true
    setSelectedIds(prev => {
      const willSelect = !prev.has(id)
      dragDirectionRef.current = willSelect ? 'select' : 'deselect'
      const next = new Set(prev)
      if (willSelect) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  /** Pointer entering another item while a drag is in progress. No-op if
      nothing is being dragged (a plain hover shouldn't select anything). */
  const dragOver = useCallback((id: string) => {
    if (!isDraggingRef.current) return
    setSelectedIds(prev => {
      const shouldHave = dragDirectionRef.current === 'select'
      if (prev.has(id) === shouldHave) return prev // already in the right state, skip a re-render
      const next = new Set(prev)
      if (shouldHave) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // One global listener ends the drag no matter where the mouse/finger lifts
  // — releasing over a gap between cards, or outside the grid entirely,
  // still has to stop the drag.
  useEffect(() => {
    const endDrag = () => { isDraggingRef.current = false }
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchend', endDrag)
    return () => {
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchend', endDrag)
    }
  }, [])

  const selectedCount = selectedIds.size

  return useMemo(() => ({
    active, enable, disable, toggleMode,
    selectedIds, toggle, selectAll, clear, isSelected, selectedCount,
    startDrag, dragOver,
  }), [active, enable, disable, toggleMode, selectedIds, toggle, selectAll, clear, isSelected, selectedCount, startDrag, dragOver])
}