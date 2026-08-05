// src/lib/parseNewsMarkdown.ts
//
// نفس فكرة GitHub/Slack: صندوق نص عادي + رموز بسيطة بدل محرر معقّد.
// **نص** = عريض، *نص* = مائل، سطر يبدأ بـ "- " = نقطة.

import type { RichSegment } from '@/components/dashboard/news/NewsFeed';

function parseBoldItalic(line: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      segments.push({ text: token.slice(2, -2), bold: true });
    } else {
      segments.push({ text: token.slice(1, -1), italic: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }
  if (segments.length === 0) segments.push({ text: '' });
  return segments;
}

/**
 * [#458482]نص[/#458482] — رمز اللون. بيلف حواليه بولد/مائل عاديين
 * كمان (parseBoldItalic بتشتغل جوّاه)، عشان تقدر تلوّن + تعرّض بنفس الوقت.
 */
function parseInline(line: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const colorRegex = /\[(#[0-9a-fA-F]{6})\]([\s\S]*?)\[\/\1\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = colorRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push(...parseBoldItalic(line.slice(lastIndex, match.index)));
    }
    const color = match[1];
    const inner = match[2];
    segments.push(...parseBoldItalic(inner).map(seg => ({ ...seg, color })));
    lastIndex = colorRegex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push(...parseBoldItalic(line.slice(lastIndex)));
  }
  if (segments.length === 0) segments.push({ text: '' });
  return segments;
}

export function parseNewsMarkdown(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const lines = text.split('\n');

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^[-•]\s+(.*)$/);
    if (bulletMatch) {
      segments.push({ text: bulletMatch[1], bullet: true });
    } else {
      segments.push(...parseInline(line));
      if (idx < lines.length - 1) segments.push({ text: '', newline: true });
    }
  });

  return segments;
}

/** بيشيل رموز التنسيق ويرجّع نص عادي — للمعاينة المختصرة بكارت الخبر. */
export function stripNewsMarkdown(text: string): string {
  return text
    .replace(/\[#[0-9a-fA-F]{6}\]/g, '')
    .replace(/\[\/#[0-9a-fA-F]{6}\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}