import { formatSum } from '@imdod/core';
import type { Product } from '../../api/types';
import { useT } from '../../i18n/useT';

interface ProductPickerModalProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export function ProductPickerModal({ products, onSelect, onClose }: ProductPickerModalProps) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <p className="mb-2 font-medium text-slate-900">{t.scan.multipleFound}</p>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-slate-100"
            >
              <span>{p.nameUz}</span>
              <span className="text-slate-500">{formatSum(p.retailPrice)}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded bg-slate-100 py-2">
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
