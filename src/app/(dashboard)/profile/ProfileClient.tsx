// src/app/(dashboard)/profile/ProfileClient.tsx
'use client';

import { useCallback, useState } from 'react';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { createClient } from '@/lib/supabase/client';
import { resizeAvatarFile } from '@/lib/resizeAvatar';
import ProfileHero from '@/components/dashboard/profile/ProfileHero';
import PersonalInfo, { type PendingEmail } from '@/components/dashboard/profile/PersonalInfo';
import SecuritySettings, { type PasswordCooldown } from '@/components/dashboard/profile/SecuritySettings';
import AdminControls, { type MemberRestrictions } from '@/components/dashboard/profile/AdminControls';
import { setMemberColor, setMemberJobTitle } from './adminActions';
import {
  updateMyName,
  updateMyAvatar,
  requestEmailChange,
  changeMyPassword,
} from './actions';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfileClient({
  userId,
  initialName,
  email,
  jobTitle,
  jobTitleAr,
  initialAvatarUrl,
  joinedDate,
  memberColor,
  isAdmin,
  canEditName,
  canEditAvatar,
  pendingEmail,
  lastLoginAt,
  cooldown,
  canEditIdentity,
  initialJobTitleEn,
  initialJobTitleAr,
  restrictions,
}: {
  userId: string;
  initialName: string;
  email: string;
  jobTitle?: string;
  jobTitleAr?: string;
  initialAvatarUrl: string | null;
  joinedDate: string;
  memberColor: string;
  isAdmin: boolean;
  canEditName: boolean;
  canEditAvatar: boolean;
  pendingEmail: PendingEmail | null;
  lastLoginAt: string | null;
  cooldown: PasswordCooldown;
  canEditIdentity: boolean;
  initialJobTitleEn: string;
  initialJobTitleAr: string;
  restrictions: MemberRestrictions;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  useScrollToHash();
  const [uploading, setUploading] = useState(false);
  const [color, setColor] = useState(memberColor);
  const [titles, setTitles] = useState({ en: initialJobTitleEn, ar: initialJobTitleAr });

  const handleSaveName = useCallback(async (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) throw new Error('name_needs_two_parts');

    const last = parts.pop() as string;
    const first = parts.join(' ');

    await updateMyName(first, last);
    setName(`${first} ${last}`);
  }, []);

  /*
    الرفع من المتصفح مباشرة لـ Storage — الملف ما بيمر بالسيرفر إطلاقًا.
    مسار الملف لازم يبدأ بـ {userId}/ عشان سياسة الـ bucket تتحقق من الملكية.

    🆕 قبل الرفع، بنصغّر الصورة لـ400×400 ونحولها WebP بجودة 85% عبر
    Canvas API بالمتصفح — عشان نقطع الحجم الضايع بين الصورة الأصلية
    (غالبًا 1000×1000+) وأكبر حجم فعلي بيتعرض فيه الأفاتار بالتطبيق.
    هاد كله client-side، ما بيضيف أي حمل على السيرفر.
  */
  const handleAvatarSelect = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_AVATAR_BYTES) return;

    setUploading(true);
    const supabase = createClient();

    try {
      const resizedBlob = await resizeAvatarFile(file);
      // 🆕 اسم ثابت لكل مستخدم بدل timestamp — كل رفعة بتستبدل الملف
      // القديم تلقائيًا (upsert: true) عوض ما تراكم ملفات يتيمة بالـStorage.
      const path = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resizedBlob, { cacheControl: '3600', upsert: true, contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // 🆕 cache-busting query param — عشان المتصفح/الـCDN ما يعرض نسخة
      // مخزّنة قديمة بعد الاستبدال (نفس الـURL أصلًا بسبب الاسم الثابت).
      const bustedUrl = `${data.publicUrl}?v=${Date.now()}`;
      await updateMyAvatar(bustedUrl);
      setAvatarUrl(bustedUrl);
    } catch {
      // المعاينة المحلية بتضل ظاهرة لحد الريفرش — الصورة القديمة هي المحفوظة
    } finally {
      setUploading(false);
    }
  }, [userId]);

  const handleRequestEmail = useCallback(async (newEmail: string) => {
    await requestEmailChange(newEmail);
  }, []);

  const handleChangePassword = useCallback(async (current: string, next: string) => {
    await changeMyPassword(current, next);
  }, []);

  const handleColorChange = useCallback(async (next: string) => {
    const previous = color;
    setColor(next);
    try {
      await setMemberColor(userId, next);
    } catch {
      setColor(previous);
    }
  }, [userId, color]);

  const handleJobTitleChange = useCallback(async (en: string, ar: string) => {
    await setMemberJobTitle(userId, en, ar);
    setTitles({ en, ar });
  }, [userId]);

  const notAllowed = useCallback(async () => {
    throw new Error('forbidden');
  }, []);

  return (
    <>
      <ProfileHero
        name={name}
        jobTitle={titles.en || titles.ar}
        jobTitleAr={titles.ar || titles.en}
        avatarUrl={avatarUrl}
        joinedDate={joinedDate}
        memberColor={color}
        isAdmin={isAdmin}
        canEditAvatar={canEditAvatar}
        uploading={uploading}
        onAvatarSelect={canEditAvatar ? handleAvatarSelect : undefined}
      />

      <PersonalInfo
        name={name}
        email={email}
        memberColor={color}
        canEditName={canEditName}
        canEditEmail
        pendingEmail={pendingEmail}
        onSaveName={handleSaveName}
        onRequestEmail={handleRequestEmail}
      />

      <SecuritySettings
        lastLoginAt={lastLoginAt}
        cooldown={cooldown}
        onChangePassword={handleChangePassword}
      />

      {canEditIdentity && (
        <AdminControls
          memberId={userId}
          memberName={name}
          memberColor={color}
          jobTitleEn={titles.en}
          jobTitleAr={titles.ar}
          restrictions={restrictions}
          pendingEmail={null}
          canEditIdentity
          isSelf
          avatarUrl={avatarUrl}
          onColorChange={handleColorChange}
          onJobTitleChange={handleJobTitleChange}
          onRestrictionToggle={notAllowed}
          onApproveEmail={notAllowed}
          onRejectEmail={notAllowed}
          onDelete={notAllowed}
        />
      )}
    </>
  );
}