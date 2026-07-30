import { formatSum } from '@imdod/core';
import { useState } from 'react';
import type { Product } from '../../api/types';
import { useT } from '../../i18n/useT';

interface SearchPanelProps {
  onSelect: (product: Product) => void;
}

const MIN_QUERY_LENGTH = 2;

export function SearchPanel({ onSelect }: SearchPanelProps) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const items = await window.imdod.catalogSearch(trimmed);
      setResults(items as Product[]);
    } finally {
      setSearching(false);
    }
  }

  function handleSelect(product: Product): void {
    onSelect(product);
    setQuery('');
    setResults([]);
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void handleSearch();
          }
        }}
        placeholder={t.common.search}
        className="w-full rounded border border-slate-300 px-3 py-2 text-lg"
      />
      {searching && <p className="mt-1 text-sm text-slate-400">{t.common.loading}</p>}
      {results.length > 0 && (
        <div className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-200">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
            >
              <span>{p.nameUz}</span>
              <span className="text-slate-500">{formatSum(p.retailPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
