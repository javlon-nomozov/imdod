import { useEffect, useRef } from 'react';
import {
  bufferToCode,
  createScanBuffer,
  pushChar,
  shouldTreatAsScan,
  type ScanBufferState,
} from '../scanner/scan-buffer';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
}

/**
 * Qidiruv inputiga fokus bo'lganda ham vaqt tahlili davom etadi — HID
 * skaner belgilari fokus qayerda bo'lishidan qat'iy nazar bir xil tez
 * ketma-ketlikda keladi. Enter FAQAT skan sifatida tanilganda
 * `preventDefault` qilinadi, aks holda odatiy (masalan qidiruv
 * formasini yuborish) xatti-harakat davom etadi.
 */
export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions): void {
  const stateRef = useRef<ScanBufferState>(createScanBuffer());
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        const state = stateRef.current;
        if (shouldTreatAsScan(state)) {
          const code = bufferToCode(state);
          stateRef.current = createScanBuffer();
          event.preventDefault();
          onScanRef.current(code);
        }
        return;
      }

      // Faqat bitta belgili tugmalar (harf/raqam) buferga qo'shiladi —
      // Shift, Ctrl, Tab kabi maxsus tugmalar e'tiborga olinmaydi.
      if (event.key.length !== 1) return;

      stateRef.current = pushChar(stateRef.current, event.key, performance.now());
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
