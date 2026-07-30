import { useEffect, useState } from 'react';
import {
  exportCatalogUrl,
  getImportTemplate,
  importCommit,
  importPreviewFile,
  importPreviewText,
} from '../api/endpoints';
import type {
  ImportCommitItem,
  ImportCommitResult,
  ImportRowPreview,
  ImportTemplate,
} from '../api/types';
import { ImportRow, type RowDecision } from '../components/import/ImportRow';

interface CatalogImportScreenProps {
  onBack: () => void;
}

// Juda o'xshash (85%+) taklif bo'lsa, standart qaror sifatida "qo'shish"
// tanlanadi — kassir/menejer baribir har qatorni ko'zdan kechirib,
// kerak bo'lsa o'zgartiradi.
const AUTO_MERGE_THRESHOLD = 0.85;

function defaultDecisions(rows: ImportRowPreview[]): Record<number, RowDecision> {
  const next: Record<number, RowDecision> = {};
  for (const row of rows) {
    if (!row.parsed) continue;
    const best = row.suggestions[0];
    next[row.rowNumber] =
      best && best.score >= AUTO_MERGE_THRESHOLD
        ? { action: 'merge', productId: best.productId, productLabel: best.nameUz }
        : { action: 'create' };
  }
  return next;
}

export function CatalogImportScreen({ onBack }: CatalogImportScreenProps) {
  const [template, setTemplate] = useState<ImportTemplate | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportRowPreview[] | null>(null);
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  useEffect(() => {
    void getImportTemplate().then(setTemplate);
  }, []);

  function applyPreview(rows: ImportRowPreview[]): void {
    setPreview(rows);
    setDecisions(defaultDecisions(rows));
    setResult(null);
  }

  async function handlePreviewText(): Promise<void> {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      applyPreview(await importPreviewText(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import qilishda xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewFile(file: File): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      applyPreview(await importPreviewFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import qilishda xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit(): Promise<void> {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const items: ImportCommitItem[] = preview.map((row): ImportCommitItem => {
        if (!row.parsed) return { action: 'skip', rowNumber: row.rowNumber };

        const decision = decisions[row.rowNumber] ?? { action: 'skip' };
        if (decision.action === 'create') {
          return { action: 'create', ...row.parsed };
        }
        if (decision.action === 'merge') {
          return {
            action: 'merge',
            rowNumber: row.rowNumber,
            productId: decision.productId,
            qty: row.parsed.qty,
            barcodes: row.parsed.barcodes,
          };
        }
        return { action: 'skip', rowNumber: row.rowNumber };
      });

      setResult(await importCommit(items));
      setPreview(null);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Katalog import/eksport</h1>
        <button type="button" onClick={onBack} className="text-sm text-slate-600">
          ← Orqaga
        </button>
      </div>

      <div className="flex gap-2">
        <a
          href={exportCatalogUrl('xlsx')}
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
        >
          Katalogni eksport qilish (Excel)
        </a>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700"
        >
          {showHelp ? 'Yordamni yashirish' : 'AI uchun shablon/matn'}
        </button>
      </div>

      {showHelp && template && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Quyidagi matnni nusxalab, ChatGPT/Gemini kabi AI&apos;ga xom ma&apos;lumotingiz (rasm,
            eski jadval) bilan birga yuboring — u shablonga mos CSV qaytaradi.
          </p>
          <textarea
            readOnly
            value={template.promptUz}
            className="h-32 w-full rounded border border-amber-300 p-2 text-xs"
          />
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(template.promptUz)}
            className="rounded bg-amber-600 px-3 py-1 text-sm text-white"
          >
            Nusxalash
          </button>
          <table className="w-full text-xs">
            <tbody>
              {template.columns.map((c) => (
                <tr key={c.key}>
                  <td className="pr-2 font-mono">{c.key}</td>
                  <td>{c.label}</td>
                  <td>{c.required ? 'majburiy' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!preview && !result && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Fayl tanlash (.xlsx yoki .csv)
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePreviewFile(file);
              }}
              className="mt-1 block"
            />
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Yoki CSV matnini shu yerga joylashtiring
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 h-32 w-full rounded border border-slate-300 p-2 text-sm"
              placeholder="nomi_uz,nomi_ru,birlik,..."
            />
            <button
              type="button"
              onClick={() => void handlePreviewText()}
              disabled={loading}
              className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? 'Yuklanmoqda...' : 'Ko‘rib chiqish'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {preview && (
        <div className="space-y-3">
          {preview.map((row) => (
            <ImportRow
              key={row.rowNumber}
              row={row}
              decision={decisions[row.rowNumber] ?? { action: 'skip' }}
              onChange={(decision) =>
                setDecisions((prev) => ({ ...prev, [row.rowNumber]: decision }))
              }
            />
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCommit()}
              disabled={loading}
              className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Saqlanmoqda...' : 'Importni yakunlash'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setDecisions({});
              }}
              className="rounded bg-slate-100 px-4 py-2 text-slate-700"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          <p>
            Import yakunlandi: {result.created} ta yangi, {result.merged} ta qo‘shildi,{' '}
            {result.skipped} ta o‘tkazib yuborildi.
          </p>
        </div>
      )}
    </div>
  );
}
