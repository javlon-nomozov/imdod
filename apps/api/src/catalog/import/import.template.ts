export interface ImportTemplateColumn {
  key: string;
  label: string;
  required: boolean;
}

/**
 * Import shabloni. Ustun nomlari (`key`) qat'iy — AI'ga beriladigan
 * `promptUz` matni ham aynan shu nomlarni talab qiladi, shuning uchun
 * ikkalasi ham shu yerda bitta joyda saqlanadi.
 */
export const IMPORT_TEMPLATE: {
  columns: ImportTemplateColumn[];
  promptUz: string;
  exampleRows: string[][];
} = {
  columns: [
    { key: 'nomi_uz', label: "Mahsulot nomi (o'zbekcha, lotin)", required: true },
    { key: 'nomi_ru', label: 'Mahsulot nomi (ruscha)', required: false },
    {
      key: 'birlik',
      label: "O'lchov birligi: DONA, KG, METR, KOMPLEKT, UPAKOVKA",
      required: true,
    },
    { key: 'kategoriya', label: "Kategoriya nomi (mavjud bo'lmasa yaratiladi)", required: false },
    { key: 'tan_narxi', label: "Tan narxi, so'm (butun son)", required: true },
    { key: 'dona_narxi', label: "Dona narxi, so'm (butun son)", required: true },
    { key: 'optom_narxi', label: "Optom narxi, so'm (bo'sh qoldirilsa 0)", required: false },
    { key: 'shtrix_kodlar', label: 'Shtrix-kodlar, vergul bilan ajratilgan', required: false },
    { key: 'miqdor', label: "Kelgan miqdor (kirim ham qo'shilishi kerak bo'lsa)", required: false },
  ],
  promptUz: `Men do'konimdagi mahsulotlar ro'yxatini quyidagi ustunlarga AYNAN mos CSV formatga o'tkaz:

nomi_uz, nomi_ru, birlik, kategoriya, tan_narxi, dona_narxi, optom_narxi, shtrix_kodlar, miqdor

Qoidalar:
- birinchi qator — aynan shu sarlavhalar (boshqa til/nom bilan emas)
- birlik faqat quyidagilardan biri bo'lsin: DONA, KG, METR, KOMPLEKT, UPAKOVKA
- narxlarni FAQAT butun son sifatida yoz (so'm belgisi, bo'shliq, vergul qo'ymasdan) — masalan 5000, "5 000 so'm" emas
- shtrix_kodlar bo'lmasa bo'sh qoldir, bir nechtasi bo'lsa vergul bilan ajrat
- miqdor — hozir kelgan/mavjud son (dona uchun butun, kg/metr uchun kasr bo'lishi mumkin, masalan 1.5)
- har bir qator — bitta mahsulot

Mana mening xom ma'lumotim (rasm, matn yoki eski jadval): [bu yerga joylashtiring]`,
  exampleRows: [
    ['Daftar 48 varaq', 'Тетрадь 48 листов', 'DONA', 'Kanstovar', '3000', '5000', '4000', '', '20'],
    ['Ruchka ko‘k', '', 'DONA', 'Kanstovar', '1000', '2000', '', '2000000000024', '50'],
  ],
};
