import { useEffect, useState } from 'react';
import * as api from './api/endpoints';
import { setApiBaseUrl, setDeviceToken } from './api/client';
import type { Sale, Shift } from './api/types';
import { PaymentModal, type SimplePaymentMethod } from './components/payment/PaymentModal';
import { ReceiptView } from './components/receipt/ReceiptView';
import { CatalogImportScreen } from './screens/CatalogImportScreen';
import { CloseShiftScreen } from './screens/CloseShiftScreen';
import { DeviceSetupScreen } from './screens/DeviceSetupScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OpenShiftScreen } from './screens/OpenShiftScreen';
import { PosScreen } from './screens/PosScreen';
import { useCartStore } from './stores/cart.store';
import { useSessionStore } from './stores/session.store';
import { useShiftStore } from './stores/shift.store';

type Screen =
  | 'loading'
  | 'device-setup'
  | 'login'
  | 'open-shift'
  | 'pos'
  | 'payment'
  | 'receipt'
  | 'close-shift'
  | 'catalog-import';

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  // Main-process konfiguratsiyasidagi standart manzil — `DeviceSetupScreen`
  // qayta hardcode qilmasligi uchun shu yerdan uzatiladi.
  const [configuredApiBaseUrl, setConfiguredApiBaseUrl] = useState('');
  const shift = useShiftStore((s) => s.shift);
  const setShift = useShiftStore((s) => s.setShift);
  const cartClear = useCartStore((s) => s.clear);

  useEffect(() => {
    void (async () => {
      const config = await window.imdod.getConfig();
      setApiBaseUrl(config.apiBaseUrl);
      setConfiguredApiBaseUrl(config.apiBaseUrl);
      if (config.deviceToken) {
        setDeviceToken(config.deviceToken);
        setScreen('login');
      } else {
        setScreen('device-setup');
      }
    })();
  }, []);

  async function handleDeviceSetupComplete(baseUrl: string, token: string): Promise<void> {
    await window.imdod.setApiBaseUrl(baseUrl);
    await window.imdod.setDeviceToken(token);
    setApiBaseUrl(baseUrl);
    setDeviceToken(token);
    setScreen('login');
  }

  /**
   * Ilova yangilanganda ham eski qurilma sozlamalari (masalan lokal
   * test paytida saqlangan `localhost` manzili) saqlanib qoladi —
   * Windows o'rnatishda foydalanuvchi ma'lumotlarini o'chirmaydi. Shu
   * tugma orqali kassir/admin qo'lda qayta sozlashi mumkin.
   */
  async function handleResetDevice(): Promise<void> {
    await window.imdod.clearDeviceToken();
    setDeviceToken(null);
    useSessionStore.getState().clearSession();
    setScreen('device-setup');
  }

  async function handleLogin(pin: string): Promise<void> {
    const tokens = await api.posLogin(pin);
    useSessionStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);

    const registerId = useSessionStore.getState().user?.registerId;
    if (!registerId) throw new Error('Token ichida registerId topilmadi');

    const current = await api.getCurrentShift(registerId);
    if (current) {
      setShift(current);
      setScreen('pos');
    } else {
      setScreen('open-shift');
    }
  }

  async function handleOpenShift(openingCash: number): Promise<void> {
    const registerId = useSessionStore.getState().user?.registerId;
    if (!registerId) throw new Error('Token ichida registerId topilmadi');
    setShift(await api.openShift(registerId, openingCash));
    setScreen('pos');
  }

  async function handleCloseShift(closingCash: number): Promise<Shift> {
    if (!shift) throw new Error('Ochiq smena yo‘q');
    const closed = await api.closeShift(shift.id, closingCash);
    setShift(null);
    return closed;
  }

  async function handlePaymentConfirm(
    payments: { method: SimplePaymentMethod; amount: number }[],
  ): Promise<void> {
    if (!shift) throw new Error('Ochiq smena yo‘q');
    const { lines, discount } = useCartStore.getState();

    const sale = await api.createSale({
      id: crypto.randomUUID(),
      shiftId: shift.id,
      cartDiscount: discount,
      lines: lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        name: l.name,
        unit: l.unit,
        qty: l.qty,
        unitPrice: l.unitPrice,
        priceType: l.priceType,
        costPrice: l.costPrice,
        discountPercent: l.discountPercent,
      })),
      payments,
      occurredAt: new Date().toISOString(),
    });

    setLastSale(sale);
    cartClear();
    setScreen('receipt');
  }

  if (screen === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-500">
        Yuklanmoqda...
      </div>
    );
  }

  if (screen === 'device-setup') {
    return (
      <DeviceSetupScreen
        initialApiBaseUrl={configuredApiBaseUrl}
        onComplete={handleDeviceSetupComplete}
      />
    );
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} onResetDevice={handleResetDevice} />;
  }

  if (screen === 'open-shift') {
    return <OpenShiftScreen onOpen={handleOpenShift} />;
  }

  if (screen === 'close-shift' && shift) {
    return (
      <CloseShiftScreen
        shift={shift}
        onClose={handleCloseShift}
        onDone={() => setScreen('login')}
      />
    );
  }

  if (screen === 'catalog-import') {
    return <CatalogImportScreen onBack={() => setScreen('pos')} />;
  }

  if (screen === 'receipt' && lastSale) {
    return <ReceiptView sale={lastSale} onDone={() => setScreen('pos')} />;
  }

  // 'pos' va 'payment' — asosiy ekran doim ko'rinadi, to'lov ustiga
  // modal sifatida ochiladi.
  return (
    <>
      <PosScreen
        onPay={() => setScreen('payment')}
        onOpenImport={() => setScreen('catalog-import')}
        onCloseShift={() => setScreen('close-shift')}
      />
      {screen === 'payment' && (
        <PaymentModal onConfirm={handlePaymentConfirm} onCancel={() => setScreen('pos')} />
      )}
    </>
  );
}
