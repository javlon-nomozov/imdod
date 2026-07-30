import { formatSum, toSum } from '@imdod/core';
import { useState, type FormEvent } from 'react';
import type { Shift } from '../api/types';
import { useT } from '../i18n/useT';

interface CloseShiftScreenProps {
  shift: Shift;
  onClose: (closingCash: number) => Promise<Shift>;
  onDone: () => void;
}

export function CloseShiftScreen({ shift, onClose, onDone }: CloseShiftScreenProps) {
  const { t } = useT();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState<Shift | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setClosed(await onClose(toSum(Number(amount) || 0)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  if (closed) {
    const variance = closed.variance ?? 0;
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-8 shadow">
          <h1 className="text-xl font-semibold text-slate-900">{t.shift.title}</h1>
          <p>
            {t.shift.expected}: {formatSum(closed.expectedCash ?? 0)}
          </p>
          <p>
            {t.shift.closingCash}: {formatSum(closed.closingCash ?? 0)}
          </p>
          <p
            className={variance !== 0 ? 'font-medium text-red-600' : 'font-medium text-emerald-600'}
          >
            {t.shift.variance}: {formatSum(variance)}
          </p>
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded bg-blue-600 py-2 text-white"
          >
            {t.common.confirm}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-slate-900">{t.shift.close}</h1>
        <p className="text-sm text-slate-500">
          {t.shift.openingCash}: {formatSum(shift.openingCash)}
        </p>
        <label className="block text-sm font-medium text-slate-700">
          {t.shift.closingCash}
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-lg"
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : t.shift.close}
        </button>
      </form>
    </div>
  );
}
