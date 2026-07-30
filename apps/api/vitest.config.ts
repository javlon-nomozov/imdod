import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild (vitest'ning standart transformatori) `emitDecoratorMetadata`ni
  // to'liq qo'llab-quvvatlamaydi — natijada NestJS DI konstruktor
  // argumentlarini in'ektsiya qila olmay, jimgina `undefined` qoldiradi.
  // `unplugin-swc` haqiqiy TypeScript metadata bilan transformatsiya qiladi.
  plugins: [swc.vite()],
  test: {
    // Testlar bitta HAQIQIY Postgres bazasini ulashadi (mock yo'q) va har
    // testdan oldin TRUNCATE qiladi. Fayllar parallel yugursa, bir fayl
    // ikkinchisining ma'lumotini o'chirib/to'qnashtirib yuboradi —
    // shuning uchun ketma-ket ishga tushiriladi.
    fileParallelism: false,
  },
});
