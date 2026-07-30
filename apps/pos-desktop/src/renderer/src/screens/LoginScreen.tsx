import { useState } from 'react';
import { ApiError } from '../api/client';
import { NumericKeypad } from '../components/layout/NumericKeypad';
import { useT } from '../i18n/useT';

interface LoginScreenProps {
  onLogin: (pin: string) => Promise<void>;
  onResetDevice: () => Promise<void>;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 8;

export function LoginScreen({ onLogin, onResetDevice }: LoginScreenProps) {
  const { t } = useT();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleReset(): Promise<void> {
    setResetting(true);
    try {
      await onResetDevice();
    } finally {
      setResetting(false);
    }
  }

  async function submit(value: string): Promise<void> {
    if (value.length < MIN_PIN_LENGTH) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(value);
    } catch (err) {
      // Faqat server aniq "ruxsat yo'q" (401) desa PIN xato deb
      // ko'rsatamiz — aks holda haqiqiy sababni (tarmoq, qurilma
      // tokeni va h.k.) yashirmasdan chiqaramiz, aks holda xatoni
      // aniqlash imkonsiz bo'lib qoladi.
      if (err instanceof ApiError && err.status === 401) {
        setError(t.auth.wrongPin);
      } else {
        setError(err instanceof Error ? err.message : t.common.error);
      }
    } finally {
      setPin('');
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-center text-xl font-semibold text-slate-900">{t.auth.pin}</h1>
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.max(pin.length, MIN_PIN_LENGTH) }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <NumericKeypad
          onDigit={(d) => {
            if (loading || pin.length >= MAX_PIN_LENGTH) return;
            setPin((prev) => prev + d);
          }}
          onBackspace={() => setPin((prev) => prev.slice(0, -1))}
        />
        <button
          type="button"
          disabled={loading || pin.length < MIN_PIN_LENGTH}
          onClick={() => void submit(pin)}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : t.auth.login}
        </button>
        <button
          type="button"
          disabled={resetting}
          onClick={() => void handleReset()}
          className="w-full text-center text-xs text-slate-400 underline disabled:opacity-50"
        >
          {resetting ? '...' : 'Kassa sozlamalarini almashtirish (server manzili / qurilma)'}
        </button>
      </div>
    </div>
  );
}
