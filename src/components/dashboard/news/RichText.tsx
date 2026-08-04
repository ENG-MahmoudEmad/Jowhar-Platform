"use client";

// Renders rich text segments (bold, italic, color, bullet points, line breaks)
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

  const flushInline = () => {
    if (currentInline.length) {
      lines.push({ type: "inline", segs: currentInline });
      currentInline = [];
    }
  };

  segments.forEach((seg) => {
    if (seg.bullet) {
      flushInline();
      lines.push({ type: "bullet", segs: [seg] });
    } else if (seg.newline) {
      flushInline();
    } else {
      currentInline.push(seg);
    }
  });
  flushInline();

  return lines;
}

const BulletLine = memo(function BulletLine({ seg, muted }: { seg: RichSegment; muted: string }) {
  const dotStyle = useMemo(() => ({
    background: seg.color || "#458482", minWidth: "6px",
  }), [seg.color])

  const textStyle = useMemo(() => ({
    color: seg.color || muted,
    fontWeight: seg.bold ? 700 : 400,
    fontStyle: seg.italic ? "italic" as const : "normal" as const,
    fontSize: "13px",
    lineHeight: "1.7",
    overflowWrap: "break-word" as const,
    wordBreak: "break-word" as const,
  }), [seg.color, seg.bold, seg.italic, muted])

  return (
    <div className="flex items-start gap-2 mt-1.5">
      <span
        className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full"
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
    fontSize: "13px",
    lineHeight: "1.7",
    color: muted,
    marginTop,
    overflowWrap: "break-word" as const,
    wordBreak: "break-word" as const,
  }), [muted, marginTop])

  return (
    <p style={pStyle}>
      {segs.map((seg, j) => (
        <span
          key={j}
          style={{
            color: seg.color || (seg.bold ? "var(--foreground)" : muted),
            fontWeight: seg.bold ? 700 : 400,
            fontStyle: seg.italic ? "italic" : "normal",
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