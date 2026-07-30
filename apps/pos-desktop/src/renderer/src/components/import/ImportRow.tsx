import { useState } from 'react';
import { formatSum, qtyToNumber } from '@imdod/core';
import { searchProducts } from '../../api/endpoints';
import type { ImportRowPreview, Product } from '../../api/types';

export type RowDecision =
  | { action: 'create' }
  | { action: 'merge'; productId: string; productLabel: string }
  | { action: 'skip' };

interface ImportRowProps {
  row: ImportRowPreview;
  decision: RowDecision;
  onChange: (decision: RowDecision) => void;
}

function decisionButtonClass(active: boolean, activeClass: string): string {
  return `rounded px-3 py-1 text-sm ${active ? activeClass : 'bg-slate-100 text-slate-700'}`;
}

export function ImportRow({ row, decision, onChange }: ImportRowProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setSearching(true);
    try {
      const { items } = await searchProducts(trimmed);
      setResults(items);
    } finally {
      setSearching(false);
    }
  }

  if (!row.parsed) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3">
        <p className="font-medium text-red-800">Qator {row.rowNumber}</p>
        <ul className="list-disc pl-5 text-sm text-red-700">
          {row.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  const { parsed } = row;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-medium text-slate-900">
          {parsed.nameUz}
          {parsed.nameRu ? <span className="ml-2 text-slate-500">({parsed.nameRu})</span> : null}
        </p>
        <p className="text-sm text-slate-500">Qator {row.rowNumber}</p>
      </div>
      <p className="text-sm text-slate-600">
        {parsed.unit} · tan narxi {formatSum(parsed.costPrice)} · dona narxi{' '}
        {formatSum(parsed.retailPrice)}
        {parsed.qty !== undefined ? ` · miqdor ${qtyToNumber(parsed.qty)}` : ''}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ action: 'create' })}
          className={decisionButtonClass(decision.action === 'create', 'bg-emerald-600 text-white')}
        >
          Yangi mahsulot
        </button>
        <button
          type="button"
          onClick={() => onChange({ action: 'skip' })}
          className={decisionButtonClass(decision.action === 'skip', 'bg-slate-600 text-white')}
        >
          O‘tkazib yuborish
        </button>
      </div>

      {row.suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-slate-500">O‘xshash mavjud mahsulotlar:</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {row.suggestions.map((s) => (
              <button
                key={s.productId}
                type="button"
                onClick={() =>
                  onChange({ action: 'merge', productId: s.productId, productLabel: s.nameUz })
                }
                className={decisionButtonClass(
                  decision.action === 'merge' && decision.productId === s.productId,
                  'bg-blue-600 text-white',
                )}
              >
                {s.nameUz} ({Math.round(s.score * 100)}%)
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSearch();
          }}
          placeholder="Boshqa mahsulot qidirish..."
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button type="button" onClick={() => void handleSearch()} className="text-sm text-blue-700">
          {searching ? 'Qidirilmoqda...' : 'Qidirish'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ action: 'merge', productId: p.id, productLabel: p.nameUz })}
              className={decisionButtonClass(
                decision.action === 'merge' && decision.productId === p.id,
                'bg-blue-600 text-white',
              )}
            >
              {p.nameUz}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        Qaror:{' '}
        {decision.action === 'create'
          ? 'Yangi mahsulot yaratiladi'
          : decision.action === 'skip'
            ? 'O‘tkazib yuboriladi'
            : `Mavjud mahsulotga qo‘shiladi: ${decision.productLabel}`}
      </p>
    </div>
  );
}
