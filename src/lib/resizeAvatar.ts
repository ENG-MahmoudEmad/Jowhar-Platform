// src/lib/resizeAvatar.ts

const AVATAR_TARGET_SIZE = 400; // px — يغطي أكبر استخدام حالي (صفحة البروفايل) بهامش أمان لشاشات Retina
const AVATAR_QUALITY = 0.85;

/**
 * بتاخد ملف صورة خام وترجع Blob مصغّر ومربّع (center-crop) بصيغة WebP.
 * الهدف: قطع الحجم الضايع بين الصورة المرفوعة (غالبًا 1000×1000+) وأكبر
 * حجم فعلي بيتعرض فيه الأفاتار بالتطبيق (~160-200px بصفحة البروفايل).
 */
export async function resizeAvatarFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Center-crop لأصغر ضلع عشان تضمن مربّع بدون تشويه
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_TARGET_SIZE;
  canvas.height = AVATAR_TARGET_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unsupported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_TARGET_SIZE, AVATAR_TARGET_SIZE);

  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))),
      'image/webp',
      AVATAR_QUALITY,
    );
  });
}