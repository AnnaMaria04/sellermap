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
    <div className="flex items-center gap-4 px-4 py-2.5 bg-[var(--c-bg2)] border-b border-[var(--c-border)] flex-shrink-0 flex-wrap">
      {/* Location */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--c-text2)]">
        <MapPin className="w-3.5 h-3.5 text-[var(--c-green)] flex-shrink-0" />
        <span className="font-medium text-[var(--c-text)]">{session.locationName}</span>
      </div>

      {/* Shift start time + elapsed */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--c-text3)]">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Смена с {formatHHMM(session.openedAt)} · {formatElapsed(session.openedAt)}
        </span>
      </div>

      {/* Cashier */}
      <span className="text-sm text-[var(--c-text3)]">{session.cashierName}</span>

      <div className="flex-1" />

      {/* Sales stats */}
      <div className="text-sm text-[var(--c-text2)]">
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red-dim)] border border-[var(--c-border)] transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Закрыть смену
      </button>
    </div>
  );
}
