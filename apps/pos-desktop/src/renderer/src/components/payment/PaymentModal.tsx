import { computeCart, computePayment, formatSum } from '@imdod/core';
import { useMemo, useState } from 'react';
import { useCartStore } from '../../stores/cart.store';
import { useT } from '../../i18n/useT';

export type SimplePaymentMethod = 'CASH' | 'CARD';

interface PaymentModalProps {
  onConfirm: (payments: { method: SimplePaymentMethod; amount: number }[]) => Promise<void>;
  onCancel: () => void;
}

export function PaymentModal({ onConfirm, onCancel }: PaymentModalProps) {
  const { t } = useT();
  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  const cart = useMemo(() => computeCart(lines, discount), [lines, discount]);

  const [cashInput, setCashInput] = useState('');
  const [cardInput, setCardInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashAmount = Number(cashInput) || 0;
  const cardAmount = Number(cardInput) || 0;

  const payment = computePayment(cart.totals.total, [
    { method: 'CASH', amount: cashAmount },
    { method: 'CARD', amount: cardAmount },
  ]);

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const payments: { method: SimplePaymentMethod; amount: number }[] = [];
      if (cashAmount > 0) payments.push({ method: 'CASH', amount: cashAmount });
      if (cardAmount > 0) payments.push({ method: 'CARD', amount: cardAmount });
      await onConfirm(payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">{t.payment.title}</h2>
        <div className="flex justify-between text-lg">
          <span>{t.payment.due}</span>
          <span className="font-semibold">{formatSum(payment.due)}</span>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          {t.payment.cash}
          <input
            type="number"
            inputMode="numeric"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-lg"
            autoFocus
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t.payment.card}
          <input
            type="number"
            inputMode="numeric"
            value={cardInput}
            onChange={(e) => setCardInput(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-lg"
          />
        </label>
        <div className="flex justify-between text-slate-700">
          <span>{t.payment.change}</span>
          <span>{formatSum(payment.change)}</span>
        </div>
        {payment.outstanding > 0 && (
          <p className="text-sm text-red-600">
            {t.payment.outstanding}: {formatSum(payment.outstanding)}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded bg-slate-100 py-2 text-slate-700"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={submitting || payment.outstanding > 0}
            onClick={() => void handleConfirm()}
            className="flex-1 rounded bg-emerald-600 py-2 text-white disabled:opacity-40"
          >
            {submitting ? '...' : t.payment.complete}
          </button>
        </div>
      </div>
    </div>
  );
}
