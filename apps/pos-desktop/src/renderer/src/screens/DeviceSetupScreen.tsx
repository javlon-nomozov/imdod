import { useState, type FormEvent } from 'react';
import { adminLogin, provisionDevice } from '../api/endpoints';
import { setApiBaseUrl as setClientApiBaseUrl } from '../api/client';

interface DeviceSetupScreenProps {
  initialApiBaseUrl: string;
  onComplete: (apiBaseUrl: string, deviceToken: string) => Promise<void>;
}

/**
 * Qurilma tokenini qo'lda ko'chirib yozish shart emas — admin telefon
 * raqami+paroli bilan kirib, shu kassa uchun tizim o'zi token yaratadi
 * (`POST /auth/admin/login` → `POST /auth/devices`). Bir marta, shu
 * kompyuterda; keyingi safar ilova to'g'ridan-to'g'ri PIN ekraniga o'tadi.
 */
export function DeviceSetupScreen({ initialApiBaseUrl, onComplete }: DeviceSetupScreenProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [registerCode, setRegisterCode] = useState('K01');
  const [registerName, setRegisterName] = useState('Bosh kassa');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const trimmedBaseUrl = apiBaseUrl.trim();
      setClientApiBaseUrl(trimmedBaseUrl);

      const { accessToken } = await adminLogin(phone.trim(), password);
      const { rawToken } = await provisionDevice(accessToken, {
        registerCode: registerCode.trim().toUpperCase(),
        registerName: registerName.trim(),
        deviceName: `${registerName.trim()} — POS`,
      });

      await onComplete(trimmedBaseUrl, rawToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-slate-900">Kassani sozlash</h1>
        <p className="text-sm text-slate-600">
          Admin login/parolingiz bilan kiring — tizim shu kompyuter uchun avtomatik ravishda kassa
          tokeni yaratadi. Bu faqat shu kompyuterda, bir marta so'raladi.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Server manzili
          <input
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Kassa kodi
            <input
              value={registerCode}
              onChange={(e) => setRegisterCode(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="K01"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Kassa nomi
            <input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Bosh kassa"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Admin telefon raqami
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="+998901234567"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Admin paroli
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
          disabled={saving}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Sozlanmoqda...' : 'Kassani ulash'}
        </button>
      </form>
    </div>
  );
}
