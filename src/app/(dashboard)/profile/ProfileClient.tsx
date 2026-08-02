// src/app/(dashboard)/profile/ProfileClient.tsx
'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  /** الـ Chief والـ Developer يعدّلوا هويتهم بنفسهم (مايجريشن 014) */
  canEditIdentity: boolean;
  initialJobTitleEn: string;
  initialJobTitleAr: string;
  restrictions: MemberRestrictions;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [color, setColor] = useState(memberColor);
  const [titles, setTitles] = useState({ en: initialJobTitleEn, ar: initialJobTitleAr });

  const handleSaveName = useCallback(async (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) throw new Error('name_needs_two_parts');

    // آخر مقطع = اسم العائلة، والباقي كله الاسم الأول (أسماء مركبة)
    const last = parts.pop() as string;
    const first = parts.join(' ');

    await updateMyName(first, last);
    setName(`${first} ${last}`);
  }, []);

  /*
    الرفع من المتصفح مباشرة لـ Storage — الملف ما بيمر بالسيرفر إطلاقًا،
    فأسرع وما بيستهلك ذاكرة الـ Server Action.
    مسار الملف لازم يبدأ بـ {userId}/ عشان سياسة الـ bucket تتحقق من الملكية.
  */
  const handleAvatarSelect = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_AVATAR_BYTES) return;

    setUploading(true);
    const supabase = createClient();

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateMyAvatar(data.publicUrl);
      setAvatarUrl(data.publicUrl);
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

  /*
    الـ Chief/Developer بيعدّلوا هويتهم من هون. `can_manage_member` بترفض
    النفس مطلقًا، فبدون هذا كان اللون والمسمّى بلا أي طريق تعديل غير SQL.
  */
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
    // الإدارة ممنوعة على النفس قصدًا — حماية من قفل الحساب برّا النظام
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

      {/*
        الهوية فقط. الدور والصلاحيات والإيقاف والحذف ممنوعين على النفس
        قصدًا — لو الـ Chief نزّل نفسه لـ member ما حدا يقدر يرجّعه.
      */}
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