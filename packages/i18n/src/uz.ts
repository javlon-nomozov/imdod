export const uz = {
  common: {
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    delete: "O'chirish",
    edit: 'Tahrirlash',
    search: 'Qidirish',
    back: 'Orqaga',
    confirm: 'Tasdiqlash',
    yes: 'Ha',
    no: "Yo'q",
    total: 'Jami',
    loading: 'Yuklanmoqda...',
    notFound: 'Topilmadi',
    error: 'Xatolik',
  },
  auth: {
    pin: 'PIN kod',
    login: 'Kirish',
    logout: 'Chiqish',
    wrongPin: "PIN kod noto'g'ri",
  },
  shift: {
    title: 'Smena',
    open: 'Smena ochish',
    close: 'Smena yopish',
    openingCash: 'Kassadagi boshlang‘ich pul',
    closingCash: 'Kassadagi yakuniy pul',
    expected: 'Bo‘lishi kerak',
    variance: 'Farq',
    notOpen: 'Smena ochilmagan',
  },
  cart: {
    title: 'Savat',
    empty: "Savat bo'sh",
    addProduct: "Mahsulot qo'shish",
    quantity: 'Miqdor',
    price: 'Narx',
    discount: 'Chegirma',
    subtotal: 'Oraliq jami',
    clear: 'Savatni tozalash',
    removeLine: "Qatorni o'chirish",
  },
  scan: {
    notFound: 'Bu shtrix-kod bo‘yicha mahsulot topilmadi',
    createNew: 'Yangi mahsulot yaratish',
    multipleFound: 'Bu kod bir nechta mahsulotga tegishli — birini tanlang',
  },
  payment: {
    title: "To'lov",
    cash: 'Naqd',
    card: 'Karta',
    debt: 'Nasiya',
    change: 'Qaytim',
    paid: "To'landi",
    due: "To'lanishi kerak",
    outstanding: 'Qoldiq',
    complete: 'Savdoni yakunlash',
  },
  product: {
    name: 'Nomi',
    barcode: 'Shtrix-kod',
    barcodes: 'Shtrix-kodlar',
    unit: "O'lchov birligi",
    costPrice: 'Tan narxi',
    retailPrice: 'Dona narxi',
    wholesalePrice: 'Optom narxi',
    stock: 'Qoldiq',
    brand: 'Brend',
    type: 'Mahsulot turi',
    description: 'Tavsif',
  },
  units: {
    DONA: 'dona',
    KG: 'kg',
    METR: 'metr',
    KOMPLEKT: 'komplekt',
    UPAKOVKA: 'upakovka',
  },
  sync: {
    online: 'Onlayn',
    offline: 'Oflayn',
    syncing: 'Sinxronlanmoqda...',
    pending: 'Yuborilmagan: {count}',
    lastSync: 'Oxirgi sinxronizatsiya: {time}',
  },
  preorder: {
    title: 'Zakaz',
    new: 'Yangi',
    inProgress: 'Yig‘ilmoqda',
    ready: 'Tayyor',
    done: 'Berildi',
    cancelled: 'Bekor qilindi',
    note: 'Zakaz ombordan kamaytirmaydi. Mijoz kelgach kassadan o‘tkaziladi.',
  },
} as const;

/**
 * Barg qiymatlarini `string` gacha kengaytiradi, kalitlar tuzilishini saqlaydi.
 *
 * `uz` obyektida `as const` turgani uchun har bir matn o'zining literal turi
 * bo'lib qoladi ("Saqlash" turi — aynan "Saqlash"). To'g'ridan-to'g'ri
 * `typeof uz` ishlatsak, ruscha tarjima ham aynan o'sha o'zbekcha matn
 * bo'lishini talab qilib qolardi. Kengaytirish shuni hal qiladi va ayni
 * paytda `ru` da BARCHA kalitlar bo'lishini majburiy qoldiradi — kalit
 * tushib qolsa TypeScript darhol aytadi.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof uz>;
