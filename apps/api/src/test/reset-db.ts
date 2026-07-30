import type { PrismaClient } from '@prisma/client';

/**
 * Har testdan oldin BARCHA jadvallarni tozalaydi. Alohida tranzaksiya
 * ichida QILINMAYDI — smena-konkurentligi va savdo-idempotentligi
 * testlari ikkita mustaqil so'rov bir xil COMMITTED holatni ko'rishini
 * talab qiladi, tashqi tranzaksiya buni buzardi.
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "ChangeLog",
      "PreOrderLine", "PreOrder", "OnlineAccount",
      "InventoryCountLine", "InventoryCount",
      "PurchaseReceiptLine", "PurchaseReceipt", "Supplier",
      "DebtTransaction", "Customer",
      "SaleReturnLine", "SaleReturn",
      "Payment", "SaleLine", "Sale",
      "Shift",
      "StockBalance", "StockMovement",
      "Barcode", "Product", "Category",
      "Device", "Register",
      "User"
    RESTART IDENTITY CASCADE
  `);
}
