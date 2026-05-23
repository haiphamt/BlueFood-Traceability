'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Pencil, X, ChevronDown, Globe, AlertTriangle, CheckCircle2, Building2, Store } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  assigned_supplier: { id: string; name: string | null } | null;
  assigned_store: { id: string; name: string | null } | null;
}

interface SupplierOption { id: string; name: string; }
interface StoreOption   { id: string; name: string; address?: string | null; province?: string | null; }

interface Props {
  initialUsers: UserRow[];
  suppliers: SupplierOption[];
  stores: StoreOption[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin:       'Quản trị viên',
  supplier:    'Nhà cung cấp',
  store_staff: 'Nhân viên cửa hàng',
  transporter: 'Vận chuyển',
  viewer:      'Người xem',
};

const ROLE_BADGE: Record<string, string> = {
  admin:       'admin-badge-blue',
  supplier:    'admin-badge-green',
  store_staff: 'admin-badge-green',
  transporter: 'admin-badge-orange',
  viewer:      'admin-badge-muted',
};

const FILTER_OPTIONS = [
  { value: '',            label: 'Tất cả' },
  { value: 'admin',       label: 'Quản trị viên' },
  { value: 'supplier',    label: 'Nhà cung cấp' },
  { value: 'store_staff', label: 'Nhân viên cửa hàng' },
  { value: 'missing',     label: 'Chưa gán' },
];

const ASSIGNABLE_ROLES = [
  { value: 'admin',       label: 'Quản trị viên' },
  { value: 'supplier',    label: 'Nhà cung cấp' },
  { value: 'store_staff', label: 'Nhân viên cửa hàng' },
  { value: 'viewer',      label: 'Người xem' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function isMissingAssignment(u: UserRow) {
  if (u.role === 'supplier'    && !u.assigned_supplier) return true;
  if (u.role === 'store_staff' && !u.assigned_store)    return true;
  return false;
}

function AssignedUnit({ user }: { user: UserRow }) {
  if (user.role === 'admin') {
    return (
      <span className="admin-badge admin-badge-green gap-1 font-semibold">
        <Globe size={10} />
        Toàn hệ thống
      </span>
    );
  }
  if (user.role === 'supplier') {
    if (user.assigned_supplier) {
      return (
        <span className="admin-ink inline-flex items-center gap-1.5 text-sm">
          <Building2 size={13} className="admin-muted-strong flex-shrink-0" />
          <span className="truncate max-w-[200px]">{user.assigned_supplier.name ?? user.assigned_supplier.id}</span>
        </span>
      );
    }
    return <MissingBadge />;
  }
  if (user.role === 'store_staff') {
    if (user.assigned_store) {
      return (
        <span className="admin-ink inline-flex items-center gap-1.5 text-sm">
          <Store size={13} className="admin-muted-strong flex-shrink-0" />
          <span className="truncate max-w-[200px]">{user.assigned_store.name ?? user.assigned_store.id}</span>
        </span>
      );
    }
    return <MissingBadge />;
  }
  return <span className="admin-muted-strong text-sm">—</span>;
}

function MissingBadge() {
  return (
    <span className="admin-badge admin-badge-orange gap-1 font-semibold">
      <AlertTriangle size={10} />
      Chưa gán
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function UserRolesClient({ initialUsers, suppliers, stores: initialStores }: Props) {
  const [users, setUsers]           = useState<UserRow[]>(initialUsers);
  const [stores, setStores]         = useState<StoreOption[]>(initialStores);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing]       = useState<UserRow | null>(null);

  useEffect(() => {
    fetch('/api/admin/stores')
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((body: { stores: StoreOption[] }) => {
        console.log('[UserRolesClient] stores', body.stores?.length, body.stores);
        if (Array.isArray(body.stores)) setStores(body.stores);
      })
      .catch((err) => {
        console.warn('[UserRolesClient] stores fetch failed:', err);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q) && !u.full_name.toLowerCase().includes(q)) return false;
      if (roleFilter === 'missing') return isMissingAssignment(u);
      if (roleFilter && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  function openEdit(user: UserRow) { setEditing(user); }

  function handleSaved(updated: UserRow) {
    setUsers((prev) => prev.map((u) => u.user_id === updated.user_id ? updated : u));
    setEditing(null);
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo email hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input w-full pl-9 pr-4 h-9 text-[13px]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.map(({ value, label }) => {
            const active = roleFilter === value;
            return (
              <button
                key={value}
                onClick={() => setRoleFilter(value)}
                className={`admin-chip px-3 py-1 ${active ? 'admin-chip-active' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                {['Email', 'Họ tên', 'Vai trò', 'Đơn vị được gán', 'Trạng thái', 'Hành động'].map((h) => (
                  <th key={h} className="admin-th py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted-strong py-16 text-center text-sm">
                    Không tìm thấy người dùng phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.viewer;
                  return (
                    <tr
                      key={u.user_id}
                      className="admin-row group"
                    >
                      <td className="admin-ink py-3 px-4 text-sm font-medium">{u.email}</td>
                      <td className="admin-muted py-3 px-4 text-sm">{u.full_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`admin-badge ${badge} font-semibold`}
                        >
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <AssignedUnit user={u} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="admin-badge admin-badge-green gap-1 font-semibold"
                        >
                          <CheckCircle2 size={10} />
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEdit(u)}
                          className="admin-secondary-button !px-3 !py-1.5 text-[11px] opacity-0 group-hover:opacity-100"
                        >
                          <Pencil size={11} />
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card-footer px-4 py-3">
          <span className="admin-muted-strong text-[12px]">
            {filtered.length} / {users.length} người dùng
          </span>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal
          user={editing}
          suppliers={suppliers}
          stores={stores}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  user: UserRow;
  suppliers: SupplierOption[];
  stores: StoreOption[];
  onClose: () => void;
  onSaved: (updated: UserRow) => void;
}

function EditModal({ user, suppliers, stores, onClose, onSaved }: EditModalProps) {
  const [role, setRole]             = useState(user.role);
  const [supplierId, setSupplierId] = useState(user.assigned_supplier?.id ?? '');
  const [storeId, setStoreId]       = useState(user.assigned_store?.id ?? '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  console.log('[EditModal] stores', stores.length, stores);

  async function handleSave() {
    setError(null);
    if (role === 'supplier' && !supplierId) { setError('Vui lòng chọn nhà cung cấp'); return; }
    if (role === 'store_staff' && !storeId) { setError('Vui lòng chọn cửa hàng'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          supplier_id: role === 'supplier' ? supplierId : undefined,
          store_id:    role === 'store_staff' ? storeId : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? 'Lỗi khi lưu thay đổi');
        return;
      }

      const newSupplier = role === 'supplier' && supplierId
        ? { id: supplierId, name: suppliers.find((s) => s.id === supplierId)?.name ?? null }
        : null;
      const newStore = role === 'store_staff' && storeId
        ? { id: storeId, name: stores.find((s) => s.id === storeId)?.name ?? null }
        : null;

      onSaved({ ...user, role, assigned_supplier: newSupplier, assigned_store: newStore });
    } catch {
      setError('Không thể kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="admin-dialog w-full max-w-md">

        {/* Header */}
        <div className="admin-dialog-header flex items-center justify-between px-5 py-4 border-b">
          <h2 className="admin-ink text-[13px] font-bold">Chỉnh sửa phân quyền</h2>
          <button onClick={onClose} disabled={saving} className="admin-icon-button p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Email (readonly) */}
          <div>
            <label className="admin-label block text-[11px] font-semibold uppercase tracking-wider mb-1.5">Email</label>
            <div className="admin-readonly-field px-3 py-2 text-sm select-all">
              {user.email}
            </div>
          </div>

          {/* Role select */}
          <div>
            <label className="admin-label block text-[11px] font-semibold uppercase tracking-wider mb-1.5">Vai trò</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setSupplierId('');
                  setStoreId('');
                  setError(null);
                }}
                className="admin-select w-full appearance-none px-3 py-2 pr-9 text-sm"
              >
                {ASSIGNABLE_ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Admin scope info */}
          {role === 'admin' && (
            <div className="admin-soft-success flex items-start gap-2.5 px-3 py-3 rounded">
              <Globe size={15} className="text-emerald-600 dark:text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="admin-link text-sm font-semibold">Toàn hệ thống</p>
                <p className="admin-muted text-xs mt-0.5">Quản trị viên có quyền truy cập toàn bộ, không cần gán đơn vị.</p>
              </div>
            </div>
          )}

          {/* Supplier assignment */}
          {role === 'supplier' && (
            <div>
              <label className="admin-label block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Nhà cung cấp <span className="admin-required">*</span>
              </label>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => { setSupplierId(e.target.value); setError(null); }}
                  className="admin-select w-full appearance-none px-3 py-2 pr-9 text-sm"
                >
                  <option value="">— Chọn nhà cung cấp —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Store assignment */}
          {role === 'store_staff' && (
            <div>
              <label className="admin-label block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Cửa hàng / Kho <span className="admin-required">*</span>
              </label>
              <div className="relative">
                <select
                  value={storeId}
                  onChange={(e) => { setStoreId(e.target.value); setError(null); }}
                  className="admin-select w-full appearance-none px-3 py-2 pr-9 text-sm"
                >
                  <option value="">— Chọn cửa hàng —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.province ? ` — ${s.province}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="admin-soft-danger flex items-center gap-2 px-3 py-2.5 rounded">
              <AlertTriangle size={13} className="text-red-600 dark:text-red-300 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="admin-dialog-footer px-5 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="admin-secondary-button px-4 py-2 text-[12px] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-primary-button px-4 py-2 text-[12px] disabled:opacity-60 min-w-[80px]"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
