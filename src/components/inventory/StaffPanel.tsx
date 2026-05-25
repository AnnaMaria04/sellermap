"use client";

import { useState, useId } from "react";
import {
  Crown,
  Pencil,
  UserMinus,
  UserCheck,
  X,
  ChevronRight,
  Plus,
  ShieldCheck,
  MapPin,
  Clock,
  Mail,
  Phone,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STAFF_MEMBERS,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_PERMISSIONS,
  LOCATIONS,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from "@/mock/inventory";

// ── helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const ROLE_AVATAR_CLASS: Record<StaffRole, string> = {
  owner: "bg-purple-500/20 text-purple-400",
  admin: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  manager: "bg-[var(--c-green-dim)] text-[var(--c-green)]",
  warehouse: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
  cashier: "bg-teal-500/20 text-teal-400",
  viewer: "bg-[var(--c-bg3)] text-[var(--c-text3)]",
};

const ROLE_BADGE_CLASS: Record<StaffRole, string> = {
  owner: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  admin: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border border-[var(--c-blue)]/30",
  manager: "bg-[var(--c-green-dim)] text-[var(--c-green)] border border-[var(--c-green)]/30",
  warehouse: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border border-[var(--c-amber)]/30",
  cashier: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  viewer: "bg-[var(--c-bg3)] text-[var(--c-text3)] border border-[var(--c-border2)]",
};

const STATUS_BADGE: Record<StaffStatus, { label: string; cls: string }> = {
  active: { label: "Активен", cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border border-[var(--c-green)]/30" },
  invited: { label: "Приглашён", cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border border-[var(--c-amber)]/30" },
  suspended: { label: "Заблокирован", cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border border-[var(--c-red)]/30" },
};

const TODAY = "2026-05-25";

function formatLastActive(date?: string): string {
  if (!date) return "Никогда";
  const today = new Date(TODAY);
  const d = new Date(date);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "вчера";
  if (diff <= 30) return `${diff} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function locationName(id: string): string {
  return LOCATIONS.find((l) => l.id === id)?.name ?? id;
}

function newId(): string {
  return "staff-" + Math.random().toString(36).slice(2, 9);
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ member, size = "md" }: { member: StaffMember; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-semibold shrink-0", sz, ROLE_AVATAR_CLASS[member.role])}>
      {getInitials(member.name)}
    </div>
  );
}

// ── Role badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE_CLASS[role])}>
      {role === "owner" && <Crown size={10} />}
      {STAFF_ROLE_LABELS[role]}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StaffStatus }) {
  const b = STATUS_BADGE[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", b.cls)}>
      {b.label}
    </span>
  );
}

// ── Invite modal ───────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onInvite: (member: StaffMember) => void;
}

function InviteModal({ onClose, onInvite }: InviteModalProps) {
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("manager");
  const [selectedLocs, setSelectedLocs] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  function toggleLoc(id: string) {
    setSelectedLocs((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
  }

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Введите имя";
    if (!email.trim()) e.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Некорректный email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onInvite({
      id: newId(),
      name: name.trim(),
      email: email.trim(),
      role,
      status: "invited",
      locations: selectedLocs,
      invitedAt: TODAY,
    });
    onClose();
  }

  const roleOptions: StaffRole[] = ["admin", "manager", "warehouse", "cashier", "viewer"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Пригласить сотрудника</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor={`${uid}-name`} className="block text-sm font-medium text-[var(--c-text2)] mb-1.5">
              Имя и фамилия
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              className={cn(
                "w-full rounded-lg border bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition",
                errors.name
                  ? "border-[var(--c-red)] focus:border-[var(--c-red)]"
                  : "border-[var(--c-border)] focus:border-[var(--c-green)]",
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-[var(--c-red)]">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor={`${uid}-email`} className="block text-sm font-medium text-[var(--c-text2)] mb-1.5">
              Email
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.ru"
              className={cn(
                "w-full rounded-lg border bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition",
                errors.email
                  ? "border-[var(--c-red)] focus:border-[var(--c-red)]"
                  : "border-[var(--c-border)] focus:border-[var(--c-green)]",
              )}
            />
            {errors.email && <p className="mt-1 text-xs text-[var(--c-red)]">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor={`${uid}-role`} className="block text-sm font-medium text-[var(--c-text2)] mb-1.5">
              Роль
            </label>
            <select
              id={`${uid}-role`}
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
              ))}
            </select>
            {/* Permissions hint */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {STAFF_ROLE_PERMISSIONS[role].map((p) => (
                <span key={p} className="rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-[11px] text-[var(--c-text3)]">{p}</span>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <p className="text-sm font-medium text-[var(--c-text2)] mb-1.5">Доступ к локациям</p>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] divide-y divide-[var(--c-border)]">
              <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg3)] transition">
                <input
                  type="checkbox"
                  checked={selectedLocs.length === 0}
                  onChange={() => setSelectedLocs([])}
                  className="accent-[var(--c-green)]"
                />
                <span className="text-sm text-[var(--c-text)]">Весь склад (все локации)</span>
              </label>
              {LOCATIONS.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg3)] transition">
                  <input
                    type="checkbox"
                    checked={selectedLocs.includes(loc.id)}
                    onChange={() => toggleLoc(loc.id)}
                    className="accent-[var(--c-green)]"
                  />
                  <span className="text-sm text-[var(--c-text)]">{loc.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Отправить приглашение
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

interface DrawerProps {
  member: StaffMember;
  onClose: () => void;
  onSave: (updated: StaffMember) => void;
}

function DetailDrawer({ member, onClose, onSave }: DrawerProps) {
  const [role, setRole] = useState<StaffRole>(member.role);
  const [status, setStatus] = useState<StaffStatus>(member.status);
  const [note, setNote] = useState(member.note ?? "");
  const [selectedLocs, setSelectedLocs] = useState<string[]>(member.locations);

  const isOwner = member.role === "owner";
  const roleOptions: StaffRole[] = ["admin", "manager", "warehouse", "cashier", "viewer"];

  function toggleLoc(id: string) {
    setSelectedLocs((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
  }

  function handleSave() {
    onSave({ ...member, role, status, note: note.trim() || undefined, locations: selectedLocs });
    onClose();
  }

  function toggleSuspend() {
    setStatus((prev) => prev === "suspended" ? "active" : "suspended");
  }

  function activate() {
    setStatus("active");
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Сотрудник</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <Avatar member={{ ...member, role }} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {member.role === "owner" && <Crown size={14} className="text-purple-400 shrink-0" />}
                <p className="font-semibold text-[var(--c-text)] truncate">{member.name}</p>
              </div>
              <p className="text-sm text-[var(--c-text3)] truncate">{member.email}</p>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-2">
            {member.phone && (
              <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <Phone size={14} className="text-[var(--c-text3)] shrink-0" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
              <Mail size={14} className="text-[var(--c-text3)] shrink-0" />
              <span className="truncate">{member.email}</span>
            </div>
            {member.lastActiveAt && (
              <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <Clock size={14} className="text-[var(--c-text3)] shrink-0" />
                <span>Последняя активность: {formatLastActive(member.lastActiveAt)}</span>
              </div>
            )}
          </div>

          {/* Current status */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <RoleBadge role={role} />
          </div>

          {/* Role selector */}
          {!isOwner && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-[var(--c-text2)]">Роль</p>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Permissions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={14} className="text-[var(--c-text3)]" />
              <p className="text-sm font-medium text-[var(--c-text2)]">Права доступа</p>
            </div>
            <ul className="space-y-1">
              {STAFF_ROLE_PERMISSIONS[role].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-[var(--c-text2)]">
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Location access */}
          {!isOwner && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={14} className="text-[var(--c-text3)]" />
                <p className="text-sm font-medium text-[var(--c-text2)]">Локации</p>
              </div>
              <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] divide-y divide-[var(--c-border)]">
                <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg3)] transition">
                  <input
                    type="checkbox"
                    checked={selectedLocs.length === 0}
                    onChange={() => setSelectedLocs([])}
                    className="accent-[var(--c-green)]"
                  />
                  <span className="text-sm text-[var(--c-text)]">Весь склад</span>
                </label>
                {LOCATIONS.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg3)] transition">
                    <input
                      type="checkbox"
                      checked={selectedLocs.includes(loc.id)}
                      onChange={() => toggleLoc(loc.id)}
                      className="accent-[var(--c-green)]"
                    />
                    <span className="text-sm text-[var(--c-text)]">{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Owner location note */}
          {isOwner && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--c-bg3)] px-3 py-2">
              <MapPin size={14} className="text-[var(--c-text3)] shrink-0" />
              <span className="text-sm text-[var(--c-text2)]">Весь склад</span>
            </div>
          )}

          {/* Note */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <StickyNote size={14} className="text-[var(--c-text3)]" />
              <p className="text-sm font-medium text-[var(--c-text2)]">Заметка</p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isOwner}
              rows={3}
              placeholder="Добавить заметку..."
              className="w-full resize-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none focus:border-[var(--c-green)] transition disabled:opacity-50"
            />
          </div>

          {/* Status controls */}
          {!isOwner && (
            <div className="flex gap-2">
              {status === "invited" && (
                <button
                  onClick={activate}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--c-green)]/40 bg-[var(--c-green-dim)] px-3 py-2 text-sm font-medium text-[var(--c-green)] hover:opacity-80 transition"
                >
                  <UserCheck size={14} />
                  Активировать
                </button>
              )}
              {status === "active" && (
                <button
                  onClick={toggleSuspend}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red-dim)] px-3 py-2 text-sm font-medium text-[var(--c-red)] hover:opacity-80 transition"
                >
                  <UserMinus size={14} />
                  Заблокировать
                </button>
              )}
              {status === "suspended" && (
                <button
                  onClick={toggleSuspend}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--c-green)]/40 bg-[var(--c-green-dim)] px-3 py-2 text-sm font-medium text-[var(--c-green)] hover:opacity-80 transition"
                >
                  <UserCheck size={14} />
                  Активировать
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isOwner && (
          <div className="shrink-0 border-t border-[var(--c-border)] px-5 py-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Сохранить
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function StaffPanel() {
  const [staff, setStaff] = useState<StaffMember[]>(STAFF_MEMBERS);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMember = staff.find((m) => m.id === selectedId) ?? null;

  const total = staff.length;
  const active = staff.filter((m) => m.status === "active").length;
  const invited = staff.filter((m) => m.status === "invited").length;
  const suspended = staff.filter((m) => m.status === "suspended").length;

  function handleInvite(member: StaffMember) {
    setStaff((prev) => [...prev, member]);
  }

  function handleSave(updated: StaffMember) {
    setStaff((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleRemove(id: string) {
    setStaff((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleToggleSuspend(member: StaffMember) {
    const newStatus: StaffStatus = member.status === "suspended" ? "active" : "suspended";
    setStaff((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m)));
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Всего", value: total, cls: "text-[var(--c-text)]" },
          { label: "Активных", value: active, cls: "text-[var(--c-green)]" },
          { label: "Приглашено", value: invited, cls: "text-[var(--c-amber)]" },
          { label: "Заблокировано", value: suspended, cls: "text-[var(--c-red)]" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
            <p className="text-xs text-[var(--c-text3)]">{label}</p>
            <p className={cn("mt-0.5 text-2xl font-bold", cls)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        {/* Table header row */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-3.5">
          <p className="text-sm font-semibold text-[var(--c-text)]">Сотрудники</p>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={14} />
            Пригласить сотрудника
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                {["Сотрудник", "Роль", "Доступ", "Последняя активность", "Статус", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--c-text3)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {staff.map((member) => {
                const isOwner = member.role === "owner";
                return (
                  <tr
                    key={member.id}
                    onClick={() => setSelectedId(member.id)}
                    className={cn(
                      "cursor-pointer transition",
                      selectedId === member.id
                        ? "bg-[var(--c-green-dim)]"
                        : "hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    {/* Сотрудник */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar member={member} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {isOwner && <Crown size={12} className="text-purple-400 shrink-0" />}
                            <span className="text-sm font-medium text-[var(--c-text)] truncate">{member.name}</span>
                          </div>
                          <span className="text-xs text-[var(--c-text3)] truncate block">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Роль */}
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>

                    {/* Доступ */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--c-text2)]">
                        {member.locations.length === 0
                          ? "Весь склад"
                          : member.locations.map(locationName).join(", ")}
                      </span>
                    </td>

                    {/* Последняя активность */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--c-text2)]">
                        {formatLastActive(member.lastActiveAt)}
                      </span>
                    </td>

                    {/* Статус */}
                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Edit */}
                        <button
                          onClick={() => setSelectedId(member.id)}
                          title="Редактировать"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Suspend / Activate / Remove */}
                        {!isOwner && (
                          member.status === "suspended" ? (
                            <button
                              onClick={() => handleToggleSuspend(member)}
                              title="Активировать"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-green-dim)] hover:text-[var(--c-green)] transition"
                            >
                              <UserCheck size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemove(member.id)}
                              title="Удалить"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-red-dim)] hover:text-[var(--c-red)] transition"
                            >
                              <UserMinus size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {staff.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--c-text3)]">
              Нет сотрудников
            </div>
          )}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />
      )}

      {/* Detail drawer */}
      {selectedMember && (
        <DetailDrawer
          member={selectedMember}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
