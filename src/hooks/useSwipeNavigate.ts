// src/hooks/useSwipeNavigate.ts

"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type SwipeDirection = 1 | -1;

type Options = {
  /** Called with 1 for "next" (swipe left) and -1 for "previous" (swipe right). */
  onNavigate: (direction: SwipeDirection) => void;
  /** Minimum pointer drag distance in px. */
  dragThreshold?: number;
  /** Accumulated trackpad delta required for one flip. */
  wheelThreshold?: number;
  /**
   * When true, native horizontal scrolling is allowed while the element still
   * has room to scroll, and swiping only kicks in at the edges. Enable this for
   * containers that are genuinely scrollable (e.g. a wide month grid).
   */
  respectNativeScroll?: boolean;
  enabled?: boolean;
};

const IDLE_END_MS = 100; // no wheel events for this long => gesture finished
const DECAY_RATIO = 0.35; // must fall this far below peak to count as decaying
const RISE_FACTOR = 2; // and then climb back this much => a new finger push

/**
 * Horizontal swipe navigation for mouse drag, touch, and trackpad two-finger
 * gestures. Guarantees one navigation per gesture: trackpad momentum keeps
 * firing events long after the fingers lift, so a gesture is only considered
 * finished when events stop, or when the delta magnitude decays and then climbs
 * sharply back up (the signature of a fresh push).
 */
export function useSwipeNavigate({
  onNavigate,
  dragThreshold = 50,
  wheelThreshold = 110,
  respectNativeScroll = false,
  enabled = true,
}: Options) {
  // A callback ref backed by state, so the wheel listener is (re)attached
  // whenever the element actually mounts. A plain useRef would silently miss
  // components that render a skeleton/early-return on their first pass.
  const [node, setNode] = useState<HTMLElement | null>(null);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);

  // Keeps the wheel listener stable while always calling the latest callback.
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };

    // Don't capture from interactive elements, or their click would be swallowed.
    if (!(e.target as HTMLElement).closest('button, a, input, select, textarea')) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [enabled]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!enabled || !start) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (Math.abs(deltaX) < dragThreshold || Math.abs(deltaX) < Math.abs(deltaY)) return;

    onNavigateRef.current(deltaX < 0 ? 1 : -1);
  }, [dragThreshold, enabled]);

  const onPointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  useEffect(() => {
    const el = node;
    if (!el || !enabled) return;

    let accumulated = 0;
    let locked = false; // one navigation per gesture
    let prevMagnitude = 0;
    let peakMagnitude = 0;
    let decaying = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const endGesture = () => {
      locked = false;
      accumulated = 0;
      prevMagnitude = 0;
      peakMagnitude = 0;
      decaying = false;
    };

    const onWheel = (e: WheelEvent) => {
      // Ignore predominantly vertical gestures (page scrolling)
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      if (respectNativeScroll) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 1) {
          const atStart = el.scrollLeft <= 0;
          const atEnd = el.scrollLeft >= maxScroll - 1;
          const scrollingIntoRoom = (e.deltaX < 0 && !atStart) || (e.deltaX > 0 && !atEnd);
          if (scrollingIntoRoom) return;
        }
      }

      e.preventDefault();

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(endGesture, IDLE_END_MS);

      const magnitude = Math.abs(e.deltaX);
      if (magnitude > peakMagnitude) peakMagnitude = magnitude;

      if (locked) {
        if (magnitude < peakMagnitude * DECAY_RATIO) decaying = true;
        else if (decaying && magnitude > prevMagnitude * RISE_FACTOR) endGesture();
        prevMagnitude = magnitude;
        if (locked) return;
        peakMagnitude = magnitude;
      }

      prevMagnitude = magnitude;
      accumulated += e.deltaX;

      if (Math.abs(accumulated) < wheelThreshold) return;

      locked = true;
      decaying = false;
      const direction: SwipeDirection = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      onNavigateRef.current(direction);
    };

    // Registered manually so it can be non-passive and call preventDefault.
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [enabled, node, respectNativeScroll, wheelThreshold]);

  return {
    ref,
    swipeHandlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onPointerLeave: onPointerCancel,
    },
    /** Apply to the swipe surface so vertical page scrolling still works on touch. */
    swipeStyle: { touchAction: 'pan-y' } as const,
  };
}