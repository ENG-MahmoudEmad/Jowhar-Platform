// src/lib/parseNewsMarkdown.ts
//
// نفس فكرة GitHub/Slack: صندوق نص عادي + رموز بسيطة بدل محرر معقّد.
// **نص** = عريض، *نص* = مائل، سطر يبدأ بـ "- " = نقطة.

import type { RichSegment } from '@/components/dashboard/news/NewsFeed';

function parseInline(line: string): RichSegment[] {
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
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}