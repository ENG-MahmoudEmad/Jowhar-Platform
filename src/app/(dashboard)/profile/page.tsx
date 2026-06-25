"use client"

import ProfileHero      from "@/components/dashboard/profile/ProfileHero";
import PersonalInfo     from "@/components/dashboard/profile/PersonalInfo";
import SecuritySettings from "@/components/dashboard/profile/SecuritySettings";

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <ProfileHero
        name="Alwaqee"
        role="Animator Pro"
        roleAr="محرك محترف"
        joinedDate="2024-03-15"
        isAdmin={false}
        canEditAvatar={true}
      />

      <PersonalInfo
        name="Alwaqee"
        email="alwaqee@jowhar.com"
        canEditName={true}
        canEditEmail={true}
      />

      <SecuritySettings
        lastLoginAt="2026-06-22T07:06:00Z"
      />

    </div>
  );
}