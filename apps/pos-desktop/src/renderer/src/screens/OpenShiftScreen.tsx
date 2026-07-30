import { toSum } from '@imdod/core';
import { useState, type FormEvent } from 'react';
import { useT } from '../i18n/useT';

interface OpenShiftScreenProps {
  onOpen: (openingCash: number) => Promise<void>;
}

export function OpenShiftScreen({ onOpen }: OpenShiftScreenProps) {
  const { t } = useT();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onOpen(toSum(Number(amount) || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-slate-900">{t.shift.open}</h1>
        <label className="block text-sm font-medium text-slate-700">
          {t.shift.openingCash}
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
          {loading ? '...' : t.shift.open}
        </button>
      </form>
    </div>
  );
}
