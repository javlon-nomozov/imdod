import { formatSum, qtyToNumber } from '@imdod/core';
import type { Sale } from '../../api/types';

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

function paymentLabel(method: string): string {
  if (method === 'CASH') return 'Naqd';
  if (method === 'CARD') return 'Karta';
  return 'Nasiya';
}

/** Chop etish uchun oddiy HTML chek — `imdod.printPreview`ga yuboriladi. */
export function buildReceiptHtml(sale: Sale): string {
  const lines = sale.lines
    .map(
      (l) => `
      <tr>
        <td>${escapeHtml(l.nameSnapshot)}</td>
        <td style="text-align:right">${qtyToNumber(l.qty)}</td>
        <td style="text-align:right">${formatSum(l.unitPrice)}</td>
        <td style="text-align:right">${formatSum(l.totalAmount)}</td>
      </tr>`,
    )
    .join('');

  const payments = sale.payments
    .map((p) => `<div>${paymentLabel(p.method)}: ${formatSum(p.amount)}</div>`)
    .join('');

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: monospace; width: 280px; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  h1 { font-size: 16px; text-align: center; }
  .total { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 8px; }
</style>
</head>
<body>
  <h1>Imdod</h1>
  <div>Chek: ${escapeHtml(sale.number)}</div>
  <div>${new Date(sale.occurredAt).toLocaleString('uz-UZ')}</div>
  <hr />
  <table>
    <thead><tr><th style="text-align:left">Nomi</th><th>Soni</th><th>Narx</th><th>Jami</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <hr />
  <div class="total"><span>Jami</span><span>${formatSum(sale.totalAmount)}</span></div>
  ${payments}
  <hr />
  <div style="text-align:center; margin-top: 8px;">Xaridingiz uchun rahmat!</div>
</body>
</html>`;
}

interface ReceiptViewProps {
  sale: Sale;
  onDone: () => void;
}

export function ReceiptView({ sale, onDone }: ReceiptViewProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-semibold text-slate-900">Savdo yakunlandi</h1>
        <p className="text-slate-600">Chek: {sale.number}</p>
        <p className="text-2xl font-semibold text-slate-900">{formatSum(sale.totalAmount)}</p>
        <button
          type="button"
          onClick={() => void window.imdod.printPreview(buildReceiptHtml(sale))}
          className="w-full rounded bg-slate-700 py-2 text-white"
        >
          Chekni chop etish
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded bg-blue-600 py-2 text-white"
        >
          Yangi savdo
        </button>
      </div>
    </div>
  );
}
