import { BrowserWindow } from 'electron';

/**
 * Chek printeri bo'lmasa PDF/preview rejimida ishlaydi — bu qabul
 * qilingan standart (kelishuv emas). OS chop etish dialogida "PDF
 * sifatida saqlash" imkoniyati bor. ESC/POS integratsiyasi (haqiqiy
 * termal printer) — texnika tekshirilmagani uchun keyingi qadam.
 */
export function openPrintPreview(html: string): Promise<void> {
  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });

    void printWindow
      .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      .then(() => {
        printWindow.webContents.print({ silent: false }, () => {
          printWindow.close();
          resolve();
        });
      });
  });
}
