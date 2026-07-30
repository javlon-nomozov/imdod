import { computeCart, formatSum } from '@imdod/core';
import { useCartStore } from '../../stores/cart.store';
import { useT } from '../../i18n/useT';
import { CartLineRow } from './CartLineRow';

interface CartProps {
  onPay: () => void;
}

export function Cart({ onPay }: CartProps) {
  const { t } = useT();
  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  const removeLine = useCartStore((s) => s.removeLine);

  const cart = computeCart(lines, discount);

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-slate-900">{t.cart.title}</h2>
      <div className="flex-1 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <p className="mt-4 text-center text-slate-400">{t.cart.empty}</p>
        ) : (
          cart.lines.map((line) => (
            <CartLineRow key={line.id} line={line} onRemove={() => removeLine(line.id)} />
          ))
        )}
      </div>
      <div className="border-t border-slate-200 pt-3">
        <div className="flex justify-between text-lg font-semibold text-slate-900">
          <span>{t.cart.subtotal}</span>
          <span>{formatSum(cart.totals.total)}</span>
        </div>
        <button
          type="button"
          disabled={cart.lines.length === 0}
          onClick={onPay}
          className="mt-3 w-full rounded bg-emerald-600 py-3 text-lg font-medium text-white disabled:opacity-40"
        >
          {t.payment.title}
        </button>
      </div>
    </div>
  );
}
