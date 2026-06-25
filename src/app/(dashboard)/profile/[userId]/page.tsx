"use client"

import { use } from "react"
import ProfileHero      from "@/components/dashboard/profile/ProfileHero"
import PersonalInfo     from "@/components/dashboard/profile/PersonalInfo"
import SecuritySettings from "@/components/dashboard/profile/SecuritySettings"
import AdminControls    from "@/components/dashboard/profile/AdminControls"
import { type MemberRole, type AdminPermissions, type MemberRestrictions } from "@/components/dashboard/profile/AdminControls"

interface MemberData {
  id:            number
  name:          string
  role:          string
  roleAr:        string
  email:         string
  joinedDate:    string
  lastLoginAt:   string
  isAdmin:       boolean
  canEditEmail:  boolean
  isBanned:      boolean
  memberColor?:  string
  banExpiresAt?: string
  pendingEmail?: { newEmail: string; requestedAt: string }
  permissions:   AdminPermissions
  restrictions:  MemberRestrictions
  currentRole:   MemberRole
}

const MOCK_MEMBERS: Record<string, MemberData> = {
  "1": {
    id: 1, name: "Jowhar", role: "Supervisor", roleAr: "مشرف",
    email: "jowhar@jowhar.com", joinedDate: "2023-01-10",
    lastLoginAt: "2026-06-22T07:06:00Z",
    isAdmin: true, canEditEmail: true, isBanned: false,
    memberColor: '#769171',
    permissions: { canAddPlatform: true, canManageMembers: true, canPublishNews: true, canManageArchive: true },
    restrictions: { avatarLocked: false, nameLocked: false },
    currentRole: "supervisor",
  },
  "2": {
    id: 2, name: "KB", role: "Animator Pro", roleAr: "محرك محترف",
    email: "kb@jowhar.com", joinedDate: "2024-03-15",
    lastLoginAt: "2026-06-22T07:06:00Z",
    isAdmin: false, canEditEmail: true, isBanned: false,
    memberColor: '#f59e0b',
    pendingEmail: { newEmail: "kb.new@gmail.com", requestedAt: "2026-06-20T10:00:00Z" },
    permissions: { canAddPlatform: false, canManageMembers: false, canPublishNews: true, canManageArchive: false },
    restrictions: { avatarLocked: false, nameLocked: false },
    currentRole: "animator-pro",
  },
  "3": {
    id: 3, name: "Medoma", role: "Concept Artist", roleAr: "فنانة مفاهيمية",
    email: "medoma@jowhar.com", joinedDate: "2024-05-01",
    lastLoginAt: "2026-06-21T14:30:00Z",
    isAdmin: false, canEditEmail: true, isBanned: true,
    memberColor: '#3b82f6',
    banExpiresAt: "2026-06-29T00:00:00Z",
    permissions: { canAddPlatform: false, canManageMembers: false, canPublishNews: false, canManageArchive: true },
    restrictions: { avatarLocked: true, nameLocked: false },
    currentRole: "concept-artist",
  },
}

function getMemberById(userId: string): MemberData {
  return MOCK_MEMBERS[userId] ?? MOCK_MEMBERS["2"]
}

const CURRENT_USER_IS_ADMIN = true

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = use(params)
  const member     = getMemberById(userId)

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <ProfileHero
        name={member.name}
        role={member.role}
        roleAr={member.roleAr}
        joinedDate={member.joinedDate}
        isAdmin={member.isAdmin}
        canEditAvatar={CURRENT_USER_IS_ADMIN ? true : !member.restrictions.avatarLocked}
      />

      <PersonalInfo
        name={member.name}
        email={member.email}
        memberColor={member.memberColor}
        canEditName={CURRENT_USER_IS_ADMIN ? true : !member.restrictions.nameLocked}
        canEditEmail={CURRENT_USER_IS_ADMIN ? true : member.canEditEmail}
      />

      {/* SecuritySettings — يظهر فقط للمستخدم نفسه، مش للأدمن */}
      {!CURRENT_USER_IS_ADMIN && (
        <SecuritySettings lastLoginAt={member.lastLoginAt} />
      )}

      {CURRENT_USER_IS_ADMIN && (
        <AdminControls
          memberId={member.id}
          memberName={member.name}
          currentRole={member.currentRole}
          memberColor={member.memberColor}
          permissions={member.permissions}
          restrictions={member.restrictions}
          isBanned={member.isBanned}
          banExpiresAt={member.banExpiresAt}
          pendingEmail={member.pendingEmail}
          onRoleChange={(role) => { console.log("role →", role) }}
          onColorChange={(color) => { console.log("color →", color) }}
          onPermissionToggle={(key) => { console.log("permission →", key) }}
          onRestrictionToggle={(key) => { console.log("restriction →", key) }}
          onApproveEmail={() => { console.log("email approved") }}
          onRejectEmail={() => { console.log("email rejected") }}
          onBan={(duration, customDays, reason) => { console.log("ban →", duration, customDays, reason) }}
          onUnban={() => { console.log("unbanned") }}
          onDelete={() => { console.log("deleted") }}
        />
      )}

    </div>
  )
}