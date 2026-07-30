import { resolvePrice, toQty } from '@imdod/core';
import { useCallback, useState } from 'react';
import type { Product, ProductScanOutcome } from '../api/types';
import { Cart } from '../components/pos/Cart';
import { SyncStatusBadge } from '../components/layout/SyncStatusBadge';
import { ProductPickerModal } from '../components/pos/ProductPickerModal';
import { ScanNotFoundToast } from '../components/pos/ScanNotFoundToast';
import { SearchPanel } from '../components/pos/SearchPanel';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCartStore } from '../stores/cart.store';
import { useLocalSessionStore } from '../stores/local-session.store';

interface PosScreenProps {
  onPay: () => void;
  onOpenImport: () => void;
  onCloseShift: () => void;
}

export function PosScreen({ onPay, onOpenImport, onCloseShift }: PosScreenProps) {
  const user = useLocalSessionStore((s) => s.user);
  const addLine = useCartStore((s) => s.addLine);
  const [pickerProducts, setPickerProducts] = useState<Product[] | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const addProductToCart = useCallback(
    (product: Product) => {
      const { priceType, unitPrice } = resolvePrice(product);
      addLine({
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.nameUz,
        unit: product.unit,
        qty: toQty(1),
        unitPrice,
        priceType,
        costPrice: product.costPrice,
      });
    },
    [addLine],
  );

  const handleOutcome = useCallback(
    (outcome: ProductScanOutcome) => {
      if (outcome.kind === 'single') {
        addProductToCart(outcome.product);
      } else if (outcome.kind === 'multiple') {
        setPickerProducts(outcome.products);
      } else {
        setNotFoundCode(outcome.code);
      }
    },
    [addProductToCart],
  );

  const handleScan = useCallback(
    (code: string) => {
      void window.imdod.catalogScan(code).then((outcome) => handleOutcome(outcome as ProductScanOutcome));
    },
    [handleOutcome],
  );

  useBarcodeScanner({ onScan: handleScan });

  const canImport = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="flex w-2/3 flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Rol</p>
            <p className="font-medium text-slate-900">{user?.role}</p>
            <SyncStatusBadge />
          </div>
          <div className="flex gap-2">
            {canImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                Katalog import
              </button>
            )}
            <button
              type="button"
              onClick={onCloseShift}
              className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              Smenani yopish
            </button>
          </div>
        </div>
        <SearchPanel onSelect={addProductToCart} />
      </div>
      <div className="w-1/3 border-l border-slate-200 bg-white p-6">
        <Cart onPay={onPay} />
      </div>

      {pickerProducts && (
        <ProductPickerModal
          products={pickerProducts}
          onSelect={(p) => {
            addProductToCart(p);
            setPickerProducts(null);
          }}
          onClose={() => setPickerProducts(null)}
        />
      )}
      {notFoundCode && (
        <ScanNotFoundToast code={notFoundCode} onDismiss={() => setNotFoundCode(null)} />
      )}
    </div>
  );
}
