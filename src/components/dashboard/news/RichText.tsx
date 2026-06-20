"use client";

// Renders rich text segments (bold, color, bullet points)
import React, { useMemo, memo } from "react";
import type { RichSegment } from "./NewsFeed";

interface RichTextProps {
  segments: RichSegment[];
  fontFamily?: string;
  muted?: string;
}

type Line = { type: "inline" | "bullet"; segs: RichSegment[] };

function buildLines(segments: RichSegment[]): Line[] {
  const lines: Line[] = [];
  let currentInline: RichSegment[] = [];

  segments.forEach((seg) => {
    if (seg.bullet) {
      if (currentInline.length) {
        lines.push({ type: "inline", segs: currentInline });
        currentInline = [];
      }
      lines.push({ type: "bullet", segs: [seg] });
    } else {
      currentInline.push(seg);
    }
  });
  if (currentInline.length) lines.push({ type: "inline", segs: currentInline });

  return lines;
}

const BulletLine = memo(function BulletLine({ seg, muted }: { seg: RichSegment; muted: string }) {
  const dotStyle = useMemo(() => ({
    background: seg.color || "#458482", minWidth: "6px",
  }), [seg.color])

  const textStyle = useMemo(() => ({
    color: seg.color || muted,
    fontWeight: seg.bold ? 700 : 400,
    fontSize: "11px",
    lineHeight: "1.6",
  }), [seg.color, seg.bold, muted])

  return (
    <div className="flex items-start gap-2 mt-1">
      <span
        className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full"
        style={dotStyle}
      />
      <span style={textStyle}>
        {seg.text}
      </span>
    </div>
  )
})

const InlineLine = memo(function InlineLine({ segs, muted, marginTop }: { segs: RichSegment[]; muted: string; marginTop: string | number }) {
  const pStyle = useMemo(() => ({
    fontSize: "11px",
    lineHeight: "1.7",
    color: muted,
    marginTop,
  }), [muted, marginTop])

  return (
    <p style={pStyle}>
      {segs.map((seg, j) => (
        <span
          key={j}
          style={{
            color: seg.color || (seg.bold ? "var(--foreground)" : muted),
            fontWeight: seg.bold ? 700 : 400,
          }}
        >
          {seg.text}
        </span>
      ))}
    </p>
  )
})

function RichText({
  segments,
  fontFamily,
  muted = "var(--foreground-muted)",
}: RichTextProps) {
  const lines = useMemo(() => buildLines(segments), [segments]);

  const containerStyle = useMemo(() => ({ fontFamily }), [fontFamily])

  return (
    <div style={containerStyle}>
      {lines.map((line, i) => {
        if (line.type === "bullet") {
          return <BulletLine key={i} seg={line.segs[0]} muted={muted} />;
        }
        return <InlineLine key={i} segs={line.segs} muted={muted} marginTop={i > 0 ? "4px" : 0} />;
      })}
    </div>
  );
}

export default memo(RichText)