import { useState, type FormEvent } from 'react';
import { adminLogin } from '../api/endpoints';
import { useSessionStore } from '../stores/session.store';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Katalog import — ADMIN/MANAGER huquqi bilan, online-only. PIN login
 * endi to'liq LOKAL bo'lgani uchun (Stage 3) hech qanday JWT bermaydi —
 * shuning uchun bu ekran o'zining alohida JWT sessiyasini oladi
 * (`useSessionStore`), faqat import oqimi uchun.
 */
export function AdminLoginScreen({ onSuccess, onCancel }: AdminLoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tokens = await adminLogin(phone.trim(), password);
      useSessionStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
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
        <h1 className="text-xl font-semibold text-slate-900">Admin/menejer kirishi</h1>
        <p className="text-sm text-slate-600">
          Katalog import internet va admin/menejer huquqini talab qiladi.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Telefon raqami
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="+998901234567"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Kirish'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs text-slate-400 underline"
        >
          Bekor qilish
        </button>
      </form>
    </div>
  );
}
