// src/app/(dashboard)/archive/validation.ts
//
// فحص Zod لكل مدخلات النصوص بأكشنز الأرشيف. قبل هالملف، الحقول كانت
// توصل مباشرة لـ.insert()/.update() بدون أي حد أقصى لطول النص ولا فحص
// إنه مش فاضي — TypeScript types بتختفي وقت التشغيل الفعلي، فأي طلب
// مباشر (مش من الواجهة) كان يقدر يبعت نص فاضي أو طويل جدًا وينقبل زي ما هو.
//
// الحدود (200 حرف للاسم، 2000 للوصف) قياسية معقولة لحقول عرض — نفس
// رتبة الحدود الموجودة أصلًا بملفات تانية بالمشروع (title 120،
// rejection reason 500، news title 200).

import { z } from 'zod';

const name = z.string().trim().min(1, 'required').max(200, 'too_long');
/** يستخدم فقط بـItem — الاسم الإنجليزي هون اختياري (لا يوجد slug يعتمد
    عليه على مستوى العنصر، بعكس Platform/Work اللي بيولّدوا slug منه). */
const optionalName = z.string().trim().max(200, 'too_long').optional().default('');
const description = z.string().trim().max(2000, 'too_long');
// الوصف اختياري ببعض الأماكن (Work/Item) — سلسلة فاضية مقبولة، بس مش أطول من الحد
const optionalDescription = z.string().trim().max(2000, 'too_long');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid_color');
const url = z.string().trim().max(2000, 'too_long').optional().or(z.literal(''));
const icon = z.string().trim().min(1, 'required').max(50, 'too_long');
const tag = z.string().trim().max(50, 'too_long').optional();
const thumbnail = z.string().trim().max(2000, 'too_long').optional();

export const platformPayloadSchema = z.object({
  nameEn: name,
  nameAr: name,
  description: optionalDescription,
  descriptionAr: optionalDescription,
  color: hexColor,
  thumbnail,
});

export const workPayloadSchema = z.object({
  nameEn: name,
  nameAr: name,
  description: optionalDescription,
  descriptionAr: optionalDescription,
  thumbnail,
});

export const sectionPayloadSchema = z.object({
  nameEn: name,
  nameAr: name,
  description: optionalDescription,
  descriptionAr: optionalDescription,
  icon,
});

export const itemPayloadSchema = z.object({
  nameEn: optionalName,
  nameAr: name,
  description: optionalDescription,
  descriptionAr: optionalDescription,
  driveUrl: url,
  thumbnail,
  tag,
});

export const filePayloadSchema = z.object({
  nameEn: name,
  nameAr: name,
  driveUrl: url,
  tag,
});

export const fileTypeSchema = z.object({
  key: z.string().trim().min(1, 'required').max(50, 'too_long'),
  color: hexColor,
});