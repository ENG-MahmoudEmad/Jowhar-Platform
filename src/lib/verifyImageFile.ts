// src/lib/verifyImageFile.ts
//
// فحص نوع الملف الحقيقي عبر "magic bytes" (أول بايتات فعلية بالملف) —
// مش اعتمادًا على file.type (Content-Type المُعلن من المتصفح، قابل
// للتزوير بسهولة) ولا على امتداد اسم الملف.
//
// بيغطي أربع صيغ الصور الشائعة بس (jpg/png/webp/gif) — نفس الصيغ يلي
// المشروع يقبلها فعليًا. لو احتجنا صيغ إضافية مستقبلًا (svg مثلاً — لازم
// معاملة خاصة لأنه نص XML مش binary، وفيه خطر XSS منفصل تمامًا)، لازم
// تعامل مستقلة.

export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/**
 * بتقرا أول 12 بايت بس من الملف (كافي لكل التوقيعات الأربعة) وبترجع
 * نوع الصورة الحقيقي، أو null لو التوقيع مش معروف/مش صورة أصلًا.
 */
export async function detectRealImageType(file: File): Promise<DetectedImageType | null> {
  const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  // JPEG: FF D8 FF
  if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    headerBytes[0] === 0x89 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x4e &&
    headerBytes[3] === 0x47
  ) {
    return 'image/png';
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (
    headerBytes[0] === 0x47 &&
    headerBytes[1] === 0x49 &&
    headerBytes[2] === 0x46 &&
    headerBytes[3] === 0x38
  ) {
    return 'image/gif';
  }

  // WebP: "RIFF" (بايت 0-3) + "WEBP" (بايت 8-11) — حاوية RIFF عامة،
  // لازم نتأكد من الجزء الثاني كمان مش بس RIFF (RIFF مستخدمة لصيغ تانية).
  if (
    headerBytes[0] === 0x52 &&
    headerBytes[1] === 0x49 &&
    headerBytes[2] === 0x46 &&
    headerBytes[3] === 0x46 &&
    headerBytes[8] === 0x57 &&
    headerBytes[9] === 0x45 &&
    headerBytes[10] === 0x42 &&
    headerBytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * فحص كامل: بيتأكد إنه الملف صورة حقيقية (مش بس مُدّعى)، وبيرجع النوع
 * الحقيقي لاستخدامه بـcontentType عند الرفع لـSupabase Storage (بدل
 * ما نثق بـfile.type المُعلن من المتصفح).
 *
 * بيرمي Error بنفس أسماء الأخطاء الموجودة أصلًا بـuploadArchiveImageAction
 * (invalid_file_type) عشان ما نغيّر شكل معالجة الأخطاء بالواجهة.
 */
export async function verifyRealImageType(file: File): Promise<DetectedImageType> {
  const realType = await detectRealImageType(file);
  if (!realType) throw new Error('invalid_file_type');
  return realType;
}