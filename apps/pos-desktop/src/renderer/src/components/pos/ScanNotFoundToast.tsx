import { useT } from '../../i18n/useT';

interface ScanNotFoundToastProps {
  code: string;
  onDismiss: () => void;
}

export function ScanNotFoundToast({ code, onDismiss }: ScanNotFoundToastProps) {
  const { t } = useT();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-white shadow-lg">
      <p>
        {t.scan.notFound}: {code}
      </p>
      <button type="button" onClick={onDismiss} className="mt-1 text-sm text-slate-300 underline">
        {t.common.back}
      </button>
    </div>
  );
}
