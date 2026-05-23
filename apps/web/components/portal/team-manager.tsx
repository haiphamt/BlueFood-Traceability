'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

interface TeamManagerProps {
  members: any[];
  invites: any[];
  canManage: boolean;
}

export function TeamManager({ members, invites, canManage }: TeamManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    const res = await fetch('/api/portal/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? 'Không gửi được lời mời');
      return;
    }
    router.refresh();
  }

  async function revoke(userId: string) {
    await fetch(`/api/portal/team/${userId}`, { method: 'DELETE' });
    router.refresh();
  }

  async function cancelInvite(id: string) {
    await fetch(`/api/portal/team/invites/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={invite} className="portal-card p-5">
        <h2 className="text-lg font-black text-white">Mời thành viên</h2>
        <p className="mt-1 text-sm portal-muted">Tối đa 5 thành viên cho mỗi nhà cung cấp.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input name="email" type="email" required disabled={!canManage} placeholder="email@company.vn" className="portal-input px-3 py-2 text-sm" />
          <select name="role" disabled={!canManage} className="portal-input px-3 py-2 text-sm">
            <option value="manager">Manager</option>
            <option value="member">Member</option>
          </select>
          <button disabled={!canManage} className="portal-button-primary">
            Gửi mời
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-[#ffb4ab]">{error}</p>}
      </form>

      <section className="portal-card">
        <div className="border-b border-white/[0.08] px-5 py-3 text-sm font-black text-white">Thành viên</div>
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3 last:border-0 hover:bg-[#1f1f22]">
            <div>
              <p className="text-sm font-bold text-white">{member.profiles?.email ?? member.user_id}</p>
              <p className="text-xs portal-muted">{member.role}</p>
            </div>
            {canManage && member.role !== 'owner' && (
              <button onClick={() => revoke(member.user_id)} className="text-sm font-bold text-[#ffb4ab] hover:text-white">Thu hồi</button>
            )}
          </div>
        ))}
      </section>

      <section className="portal-card">
        <div className="border-b border-white/[0.08] px-5 py-3 text-sm font-black text-white">Lời mời đang chờ</div>
        {invites.length === 0 ? (
          <p className="px-5 py-6 text-sm portal-muted">Không có lời mời đang chờ.</p>
        ) : invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3 last:border-0 hover:bg-[#1f1f22]">
            <div>
              <p className="text-sm font-bold text-white">{invite.email}</p>
              <p className="text-xs portal-muted">{invite.role}</p>
            </div>
            {canManage && <button onClick={() => cancelInvite(invite.id)} className="text-sm font-bold text-[#ffb4ab] hover:text-white">Hủy lời mời</button>}
          </div>
        ))}
      </section>
    </div>
  );
}
