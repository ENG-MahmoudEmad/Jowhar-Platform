// src/components/ui/Avatar.tsx
"use client";

import React, { memo } from 'react';
import Image from 'next/image';

interface AvatarProps {
  avatarUrl?: string | null;
  initials: string;
  /** Used for the img alt text. */
  name?: string;
  /** Size in px — applies to both width and height. */
  size: number;
  /** 'circle' (default) matches Sidebar/Leaderboard; 'square' matches TeamProgress's rounded-lg avatars. */
  shape?: 'circle' | 'square';
  /**
   * When provided, renders a colored gradient as the fallback background
   * (same recipe as Sidebar's member-color avatar). Omit this when the
   * caller wants full control over the background via `className`/`style`
   * (e.g. TeamProgress's neutral bg-[var(--team-avatar-bg)] box).
   */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Single source of truth for the "real photo, fallback to initials" pattern.
 * Extracted from Sidebar.tsx's user card — every component that shows a
 * member's picture should render through this instead of re-implementing
 * the <img>/initials branch locally.
 */
const Avatar = memo(function Avatar({
  avatarUrl,
  initials,
  name,
  size,
  shape = 'circle',
  color,
  className,
  style,
}: AvatarProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const backgroundStyle: React.CSSProperties = color
    ? { background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }
    : {};

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden font-bold ${shapeClass} ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        ...backgroundStyle,
        ...style,
      }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name ?? initials}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          // الأفاتار كتير صغير (عادة 24-64px) وبيظهر بأماكن كتير بنفس
          // الصفحة (Sidebar, MembersCard, Leaderboard...) — unoptimized
          // بيتفادى تكلفة إعادة معالجة كل صورة بأحجام مختلفة على سيرفر
          // Next.js لصورة أصلاً صغيرة، بدون ما نخسر أهم فايدتين من
          // <Image>: lazy loading التلقائي ومنع layout shift.
          unoptimized
        />
      ) : (
        initials
      )}
    </div>
  );
});

export default Avatar;