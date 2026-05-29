"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, LogOut } from "lucide-react";
import { usePOSSession } from "@/store/pos-session";
import { formatRub } from "@/lib/utils";

function formatHHMM(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  return `${hours} ч ${minutes} мин`;
}

interface POSSessionBarProps {
  onCloseShift: () => void;
}

export function POSSessionBar({ onCloseShift }: POSSessionBarProps) {
  const { session } = usePOSSession();
  const [, setTick] = useState(0);

  // Update elapsed time every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5 bg-[var(--c-bg2)] border-b border-[var(--c-border)] flex-shrink-0">
      {/* Location */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--c-text2)] min-w-0">
        <MapPin className="w-3.5 h-3.5 text-[var(--c-green)] flex-shrink-0" />
        <span className="font-medium text-[var(--c-text)] truncate">{session.locationName}</span>
      </div>

      {/* Shift start time + elapsed */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--c-text3)]">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="whitespace-nowrap">
          Смена с {formatHHMM(session.openedAt)} · {formatElapsed(session.openedAt)}
        </span>
      </div>

      {/* Cashier */}
      <span className="hidden text-sm text-[var(--c-text3)] sm:inline truncate">{session.cashierName}</span>

      <div className="hidden flex-1 sm:block" />

      {/* Sales stats */}
      <div className="text-sm text-[var(--c-text2)] whitespace-nowrap">
        Продаж:{" "}
        <span className="font-semibold text-[var(--c-text)]">{session.transactionCount}</span>
        {" · "}
        <span className="font-semibold text-[var(--c-green)] tabular-nums">
          {formatRub(session.salesTotal)}
        </span>
      </div>

      {/* Close shift button */}
      <button
        type="button"
        onClick={onCloseShift}
        className="ml-auto sm:ml-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red-dim)] border border-[var(--c-border)] transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Закрыть смену</span>
        <span className="sm:hidden">Закрыть</span>
      </button>
    </div>
  );
}
