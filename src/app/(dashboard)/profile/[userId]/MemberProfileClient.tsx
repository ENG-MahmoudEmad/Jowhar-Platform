// src/app/(dashboard)/profile/[userId]/MemberProfileClient.tsx
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { createClient } from '@/lib/supabase/client';
import ProfileHero from '@/components/dashboard/profile/ProfileHero';
import PersonalInfo, { type PendingEmail } from '@/components/dashboard/profile/PersonalInfo';
import AdminControls, {
  type MemberRestrictions,
  type PendingEmailChange,
} from '@/components/dashboard/profile/AdminControls';
import {
  setMemberColor,
  setMemberJobTitle,
  setMemberAvatar,
  setMemberName,
  toggleProfileLock,
  approveEmailChange,
  rejectEmailChange,
  softDeleteMember,
} from '../adminActions';

export default function MemberProfileClient({
  memberId,
  firstName: initialFirstName,
  lastName: initialLastName,
  email,
  jobTitleEn,
  jobTitleAr,
  avatarUrl,
  joinedDate,
  initialColor,
  isAdmin,
  isChief,
  initialRestrictions,
  pendingEmail,
  canEditIdentity,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitleEn: string;
  jobTitleAr: string;
  avatarUrl: string | null;
  joinedDate: string;
  initialColor: string;
  isAdmin: boolean;
  /** الشيف أدمن فقط مسموحله يترك Last Name فاضي */
  isChief: boolean;
  initialRestrictions: MemberRestrictions;
  pendingEmail: PendingEmailChange | null;
  canEditIdentity: boolean;
}) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName]   = useState(initialLastName);
  const [color, setColor] = useState(initialColor);

  useScrollToHash();
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [titles, setTitles] = useState({ en: jobTitleEn, ar: jobTitleAr });
  const [restrictions, setRestrictions] = useState(initialRestrictions);

  const handleColorChange = useCallback(async (next: string) => {
    const previous = color;
    setColor(next);
    try {
      await setMemberColor(memberId, next);
    } catch {
      setColor(previous);
    }
  }, [memberId, color]);

  const handleAvatarSelect = useCallback(async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;

    setUploading(true);
    const supabase = createClient();

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${memberId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await setMemberAvatar(memberId, data.publicUrl);
      setAvatar(data.publicUrl);
    } catch {
      // الصورة القديمة هي المحفوظة
    } finally {
      setUploading(false);
    }
  }, [memberId]);

  /*
    الـ Chief/Developer يعدّلوا اسم العضو. التحقق (أحرف إنجليزية فقط،
    استثناء last name الفاضي بس للشيف أدمن) صاير جوا PersonalInfo قبل
    ما توصل هون — هون بس منحدث الحالة المحلية ومنستدعي السيرفر.
  */
  const handleSaveName = useCallback(async (first: string, last: string) => {
    await setMemberName(memberId, first, last);
    setFirstName(first);
    setLastName(last);
  }, [memberId]);

  const handleJobTitleChange = useCallback(async (en: string, ar: string) => {
    await setMemberJobTitle(memberId, en, ar);
    setTitles({ en, ar });
  }, [memberId]);

  const handleRestrictionToggle = useCallback(async (
    key: keyof MemberRestrictions,
    value: boolean
  ) => {
    setRestrictions((prev) => ({ ...prev, [key]: value }));
    try {
      await toggleProfileLock(memberId, key === 'nameLocked' ? 'name' : 'avatar', value);
    } catch {
      setRestrictions((prev) => ({ ...prev, [key]: !value }));
    }
  }, [memberId]);

  const handleApproveEmail = useCallback(async () => {
    await approveEmailChange(memberId);
    router.refresh();
  }, [memberId, router]);

  const handleRejectEmail = useCallback(async () => {
    await rejectEmailChange(memberId);
    router.refresh();
  }, [memberId, router]);

  const handleDelete = useCallback(async () => {
    await softDeleteMember(memberId);
    router.push('/adminControl');
  }, [memberId, router]);

  const displayTitle = titles.en || titles.ar;
  const displayTitleAr = titles.ar || titles.en;
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;

  const heroPending: PendingEmail | null = pendingEmail
    ? { newEmail: pendingEmail.newEmail, stage: pendingEmail.stage }
    : null;

  return (
    <>
      <ProfileHero
        name={displayName}
        jobTitle={displayTitle}
        jobTitleAr={displayTitleAr}
        avatarUrl={avatar}
        joinedDate={joinedDate}
        memberColor={color}
        isAdmin={isAdmin}
        canEditAvatar={canEditIdentity}
        uploading={uploading}
        onAvatarSelect={canEditIdentity ? handleAvatarSelect : undefined}
      />

      <PersonalInfo
        firstName={firstName}
        lastName={lastName}
        email={email}
        memberColor={color}
        canEditName={canEditIdentity}
        canEditEmail={false}
        isChief={isChief}
        pendingEmail={heroPending}
        onSaveName={canEditIdentity ? handleSaveName : undefined}
      />

      <AdminControls
        memberId={memberId}
        memberName={displayName}
        memberColor={color}
        jobTitleEn={titles.en}
        jobTitleAr={titles.ar}
        restrictions={restrictions}
        pendingEmail={pendingEmail}
        canEditIdentity={canEditIdentity}
        avatarUrl={avatar}
        onColorChange={handleColorChange}
        onJobTitleChange={handleJobTitleChange}
        onRestrictionToggle={handleRestrictionToggle}
        onApproveEmail={handleApproveEmail}
        onRejectEmail={handleRejectEmail}
        onDelete={handleDelete}
      />
    </>
  );
}