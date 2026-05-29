"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ScanLine, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BarcodeInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function BarcodeInput({
  onScan,
  placeholder = "Сканировать штрихкод...",
  className,
  disabled,
  autoFocus,
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastKeypressTime = useRef(0);
  const keypressCount = useRef(0);

  // Refs for camera cleanup
  const zxingReaderRef = useRef<{ stop: () => void } | null>(null);
  const nativeStreamRef = useRef<MediaStream | null>(null);
  const nativeAnimRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMobile(
      /Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768,
    );
  }, []);

  // Cleanup camera when modal closes
  useEffect(() => {
    if (!showCamera) {
      stopCamera();
    }
  }, [showCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (zxingReaderRef.current) {
      try { zxingReaderRef.current.stop(); } catch { /* ignore */ }
      zxingReaderRef.current = null;
    }
    if (nativeAnimRef.current !== null) {
      cancelAnimationFrame(nativeAnimRef.current);
      nativeAnimRef.current = null;
    }
    if (nativeStreamRef.current) {
      nativeStreamRef.current.getTracks().forEach((t) => t.stop());
      nativeStreamRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    if (now - lastKeypressTime.current > 300) {
      keypressCount.current = 0;
    }
    lastKeypressTime.current = now;
    keypressCount.current++;

    if (e.key === "Enter") {
      const value = inputRef.current?.value ?? "";
      if (keypressCount.current >= 4 && value.length >= 4) {
        e.preventDefault();
        onScan(value);
        if (inputRef.current) inputRef.current.value = "";
        keypressCount.current = 0;
      }
    }
  }

  const handleDetected = useCallback(
    (code: string) => {
      onScan(code);
      setShowCamera(false);
    },
    [onScan],
  );

  async function startCamera() {
    setShowCamera(true);

    // Wait a tick for the video element to be in the DOM
    await new Promise<void>((resolve) => setTimeout(resolve, 80));

    const videoEl = document.getElementById("barcode-video") as HTMLVideoElement | null;
    if (!videoEl) return;

    if ("BarcodeDetector" in window) {
      // Native BarcodeDetector API
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: [
            "code_128", "code_39", "ean_13", "ean_8",
            "upc_a", "upc_e", "qr_code", "data_matrix",
          ],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        nativeStreamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();

        let detected = false;

        function detectLoop() {
          if (detected || !showCamera) return;
          detector
            .detect(videoEl)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0 && !detected) {
                detected = true;
                handleDetected(barcodes[0].rawValue as string);
              } else {
                nativeAnimRef.current = requestAnimationFrame(detectLoop);
              }
            })
            .catch(() => {
              nativeAnimRef.current = requestAnimationFrame(detectLoop);
            });
        }

        nativeAnimRef.current = requestAnimationFrame(detectLoop);
      } catch {
        // Camera permission denied or API error — fall through silently
        setShowCamera(false);
      }
    } else {
      // Fallback: @zxing/browser
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoEl,
          (result, _error) => {
            if (result) {
              controls.stop();
              zxingReaderRef.current = null;
              handleDetected(result.getText());
            }
          },
        );
        zxingReaderRef.current = controls;
      } catch {
        setShowCamera(false);
      }
    }
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <ScanLine
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] py-2 pl-9 pr-3 text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] transition"
        />
      </div>

      {isMobile && (
        <button
          type="button"
          onClick={startCamera}
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition disabled:opacity-50"
          title="Открыть камеру"
        >
          <Camera size={16} />
        </button>
      )}

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="relative w-full max-w-sm rounded-t-2xl bg-[var(--c-bg)] p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--c-text)]">Сканирование</p>
              <button
                onClick={() => setShowCamera(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
                aria-label="Закрыть камеру"
              >
                <X size={16} />
              </button>
            </div>
            <video
              id="barcode-video"
              className="w-full rounded-xl bg-black aspect-video"
              muted
              playsInline
            />
            <p className="mt-2 text-center text-xs text-[var(--c-text3)]">
              Наведите камеру на штрихкод
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
