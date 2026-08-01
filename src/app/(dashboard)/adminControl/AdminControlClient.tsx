// src/app/(dashboard)/adminControl/AdminControlClient.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import MembersControl, {
  type PendingRequest,
  type Member,
} from '@/components/dashboard/adminControl/MembersControl';
import AddTask from '@/components/dashboard/adminControl/AddTask';
import DirectorNotes from '@/components/dashboard/adminControl/DirectorNotes';
import RolesPermissions from '@/components/dashboard/adminControl/RolesPermissions';
import ViewFullProfileButton from '@/components/dashboard/adminControl/ViewFullProfileButton';

export default function AdminControlClient({
  initialPending,
  initialMembers,
}: {
  initialPending: PendingRequest[];
  initialMembers: Member[];
}) {
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; isChief: boolean } | null>(null);

  return (
    <>
      <MembersControl
        initialPending={initialPending}
        initialMembers={initialMembers}
        selectedMemberId={selectedMember?.id ?? null}
        onSelectMember={(id, name, isChief) => setSelectedMember({ id, name, isChief })}
      />

      {selectedMember && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background-alt)] px-4 py-2.5">
            <p className="text-xs font-medium text-[var(--foreground-muted)]">
              Managing: <span className="font-bold text-[var(--foreground)]">{selectedMember.name}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="cursor-pointer rounded-lg p-1 text-[var(--foreground-muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AddTask memberId={selectedMember.id} />
            <DirectorNotes memberId={selectedMember.id} />
          </div>

          <RolesPermissions memberId={selectedMember.id} isChief={selectedMember.isChief} />

          <ViewFullProfileButton memberId={selectedMember.id} />
        </>
      )}
    </>
  );
}