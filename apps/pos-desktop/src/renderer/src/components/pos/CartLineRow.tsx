import { formatSum, qtyToNumber, type CartLine } from '@imdod/core';
import { useT } from '../../i18n/useT';

interface CartLineRowProps {
  line: CartLine;
  onRemove: () => void;
}

export function CartLineRow({ line, onRemove }: CartLineRowProps) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <div>
        <p className="font-medium text-slate-900">{line.name}</p>
        <p className="text-sm text-slate-500">
          {qtyToNumber(line.qty)} {t.units[line.unit]} × {formatSum(line.unitPrice)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-medium text-slate-900">{formatSum(line.total)}</p>
        <button type="button" onClick={onRemove} className="text-sm text-red-600">
          {t.cart.removeLine}
        </button>
      </div>
    </div>
  );
}
