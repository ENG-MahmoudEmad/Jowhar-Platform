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
  initialFirstName,
  initialLastName,
  email,
  jobTitle,
  jobTitleAr,
  initialAvatarUrl,
  joinedDate,
  memberColor,
  isAdmin,
  isChief,
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
  initialFirstName: string;
  initialLastName: string;
  email: string;
  jobTitle?: string;
  jobTitleAr?: string;
  initialAvatarUrl: string | null;
  joinedDate: string;
  memberColor: string;
  isAdmin: boolean;
  /** الشيف أدمن فقط مسموحله يترك Last Name فاضي */
  isChief: boolean;
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
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName]   = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  useScrollToHash();
  const [uploading, setUploading] = useState(false);
  const [color, setColor] = useState(memberColor);
  const [titles, setTitles] = useState({ en: initialJobTitleEn, ar: initialJobTitleAr });

  // التحقق (أحرف إنجليزية فقط) والـ auto-capitalize صايرين جوا PersonalInfo
  // نفسها قبل ما توصل هون — هون بس منحدث الحالة المحلية ومنستدعي السيرفر.
  const handleSaveName = useCallback(async (first: string, last: string) => {
    await updateMyName(first, last);
    setFirstName(first);
    setLastName(last);
  }, []);

  const handleAvatarSelect = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_AVATAR_BYTES) return;

    setUploading(true);
    const supabase = createClient();

    try {
      const resizedBlob = await resizeAvatarFile(file);
      const path = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resizedBlob, { cacheControl: '3600', upsert: true, contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
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

  const displayName = lastName ? `${firstName} ${lastName}` : firstName;

  return (
    <>
      <ProfileHero
        name={displayName}
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
        firstName={firstName}
        lastName={lastName}
        email={email}
        memberColor={color}
        canEditName={canEditName}
        canEditEmail
        isChief={isChief}
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
          memberName={displayName}
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