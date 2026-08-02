// src/app/(dashboard)/profile/[userId]/MemberProfileClient.tsx
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  name: initialName,
  email,
  jobTitleEn,
  jobTitleAr,
  avatarUrl,
  joinedDate,
  initialColor,
  isAdmin,
  initialRestrictions,
  pendingEmail,
  canEditIdentity,
}: {
  memberId: string;
  name: string;
  email: string;
  jobTitleEn: string;
  jobTitleAr: string;
  avatarUrl: string | null;
  joinedDate: string;
  initialColor: string;
  isAdmin: boolean;
  initialRestrictions: MemberRestrictions;
  pendingEmail: PendingEmailChange | null;
  canEditIdentity: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
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

  /*
    نفس مسار الرفع تبع العضو: المجلد الأول لازم يكون uuid **صاحب الصورة**
    مش الرافع — سياسة الـ bucket بتتحقق من `can_edit_identity(auth.uid(), folder)`.
  */
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
    الـ Chief/Developer يعدّلوا اسم العضو — حاجة عملية (اسم مخل، أو عضو
    بيلعب بالاسم كل يوم). القفل `lock_name` بيوقف العضو نفسه بس، وما
    بينطبق على اللي حاطه.
  */
  const handleSaveName = useCallback(async (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) throw new Error('name_needs_two_parts');

    const last = parts.pop() as string;
    const first = parts.join(' ');

    await setMemberName(memberId, first, last);
    setName(`${first} ${last}`);
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

  /*
    الموافقة والرفض بيغيّروا حالة الطلب بالسيرفر، والواجهة لازم تعيد الجلب
    عشان تعرف المرحلة الجديدة. هون `router.refresh()` صحيح — الحالة جاية
    من السيرفر أصلاً وما في حالة محلية نخسرها.
  */
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

  // العضو المعروض هو صاحب هالمسمّى — الأدمن ما بيعدّل اسمه ولا صورته
  const displayTitle = titles.en || titles.ar;
  const displayTitleAr = titles.ar || titles.en;

  const heroPending: PendingEmail | null = pendingEmail
    ? { newEmail: pendingEmail.newEmail, stage: pendingEmail.stage }
    : null;

  return (
    <>
      <ProfileHero
        name={name}
        jobTitle={displayTitle}
        jobTitleAr={displayTitleAr}
        avatarUrl={avatar}
        joinedDate={joinedDate}
        memberColor={color}
        isAdmin={isAdmin}
        // الصورة جزء من الهوية — نفس صلاحية اللون والمسمّى
        canEditAvatar={canEditIdentity}
        uploading={uploading}
        onAvatarSelect={canEditIdentity ? handleAvatarSelect : undefined}
      />

      <PersonalInfo
        name={name}
        email={email}
        memberColor={color}
        canEditName={canEditIdentity}
        canEditEmail={false}
        pendingEmail={heroPending}
        onSaveName={canEditIdentity ? handleSaveName : undefined}
      />

      <AdminControls
        memberId={memberId}
        memberName={name}
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