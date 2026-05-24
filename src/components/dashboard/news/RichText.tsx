"use client";

// Renders rich text segments (bold, color, bullet points)
import React from "react";
import type { RichSegment } from "./NewsFeed";

interface RichTextProps {
  segments: RichSegment[];
  fontFamily?: string;
  muted?: string;
}

export default function RichText({
  segments,
  fontFamily,
  muted = "var(--foreground-muted)",
}: RichTextProps) {
  // Group bullet segments separately from inline
  const lines: { type: "inline" | "bullet"; segs: RichSegment[] }[] = [];
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

  return (
    <div style={{ fontFamily }}>
      {lines.map((line, i) => {
        if (line.type === "bullet") {
          const seg = line.segs[0];
          return (
            <div key={i} className="flex items-start gap-2 mt-1">
              <span
                className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: seg.color || "#458482", minWidth: "6px" }}
              />
              <span
                style={{
                  color: seg.color || muted,
                  fontWeight: seg.bold ? 700 : 400,
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
              >
                {seg.text}
              </span>
            </div>
          );
        }
        return (
          <p
            key={i}
            style={{
              fontSize: "11px",
              lineHeight: "1.7",
              color: muted,
              marginTop: i > 0 ? "4px" : 0,
            }}
          >
            {line.segs.map((seg, j) => (
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
        );
      })}
    </div>
  );
}
