"use client";

import { useState } from "react";
import { usePOSSession } from "@/store/pos-session";
import { POSSessionStart } from "@/components/pos/POSSessionStart";
import { POSSessionBar } from "@/components/pos/POSSessionBar";
import { POSCloseShift } from "@/components/pos/POSCloseShift";
import { POSSellScreen } from "@/components/pos/POSSellScreen";

export default function POSPage() {
  const { session } = usePOSSession();
  const [showCloseShift, setShowCloseShift] = useState(false);

  if (!session) {
    return <POSSessionStart />;
  }

  return (
    <div className="flex flex-col h-screen">
      <POSSessionBar onCloseShift={() => setShowCloseShift(true)} />
      {showCloseShift && (
        <POSCloseShift
          onClose={() => setShowCloseShift(false)}
          onConfirm={() => setShowCloseShift(false)}
        />
      )}
      <div className="flex-1 overflow-hidden">
        <POSSellScreen />
      </div>
    </div>
  );
}
