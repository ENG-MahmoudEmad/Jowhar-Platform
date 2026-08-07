//src\lib\useUndoableDelete.ts
"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How long a delete stays reversible before it's finalized. Deleting a
 * section or an item takes everything inside it with it, so this window is
 * deliberately generous compared to a typical "undo" toast (which is often
 * 4-5s) — the user asked specifically for 10s given how destructive these
 * actions are.
 */
export const UNDO_WINDOW_MS = 10_000

export interface PendingDeletion {
  id:          string
  label:       string
  /** 0–100, for a shrinking progress affordance if the UI wants one. */
  percentLeft: number
  secondsLeft: number
}

/**
 * Generic "soft delete with a countdown" pattern, shared by section deletion,
 * item deletion, and file deletion.
 *
 * Usage: the caller hides anything in `isPending(id)` from its own list
 * immediately (so the UI feels instant), keeps the real data around, and
 * only actually removes it in `onFinalize` once the countdown completes.
 * `undo(id)` cancels the timer — the caller un-hides the row, nothing was
 * ever actually deleted.
 */
export function useUndoableDelete() {
  const [pending, setPending] = useState<Map<string, PendingDeletion>>(new Map())

  // Timer bookkeeping lives in refs, not state — state is only for what the
  // UI needs to render (label + time left), not for interval/timeout handles.
  const timersRef = useRef<Map<string, { timeoutId: ReturnType<typeof setTimeout>; intervalId: ReturnType<typeof setInterval> }>>(new Map())
  const finalizeCallbacksRef = useRef<Map<string, () => void>>(new Map())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      // Unmounting mid-countdown (navigating away) — clear timers so nothing
      // fires against a component that's gone. This intentionally does NOT
      // finalize the delete; the caller's own data still has the item, it
      // simply never got the finalize call. That's the safer default for a
      // destructive action than silently deleting after the user navigated
      // away.
      for (const { timeoutId, intervalId } of timers.values()) {
        clearTimeout(timeoutId)
        clearInterval(intervalId)
      }
      timers.clear()
    }
  }, [])

  const scheduleDelete = useCallback((id: string, label: string, onFinalize: () => void) => {
    finalizeCallbacksRef.current.set(id, onFinalize)

    const startedAt = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startedAt
      const msLeft = Math.max(0, UNDO_WINDOW_MS - elapsed)
      setPending(prev => {
        const next = new Map(prev)
        next.set(id, {
          id,
          label,
          percentLeft: Math.round((msLeft / UNDO_WINDOW_MS) * 100),
          secondsLeft: Math.ceil(msLeft / 1000),
        })
        return next
      })
    }

    tick() // paint immediately, don't wait a full second for the first tick

    const intervalId = setInterval(tick, 250)

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      timersRef.current.delete(id)
      setPending(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      finalizeCallbacksRef.current.get(id)?.()
      finalizeCallbacksRef.current.delete(id)
    }, UNDO_WINDOW_MS)

    timersRef.current.set(id, { timeoutId, intervalId })
  }, [])

  const undo = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer.timeoutId)
      clearInterval(timer.intervalId)
      timersRef.current.delete(id)
    }
    finalizeCallbacksRef.current.delete(id)
    setPending(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isPending = useCallback((id: string) => pending.has(id), [pending])

  return {
    /** Everything currently mid-countdown, for rendering undo toasts. */
    pendingDeletions: Array.from(pending.values()),
    /** True while `id`'s delete is still reversible — hide it from lists. */
    isPending,
    scheduleDelete,
    undo,
  }
}