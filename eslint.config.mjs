import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/.next/**', '**/out/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // NestJS istisnosi.
    //
    // `consistent-type-imports` konstruktorga inyeksiya qilinadigan
    // klasslarni ham "faqat tip" deb hisoblaydi va `import type` ga
    // o'tkazishni talab qiladi. Lekin NestJS `emitDecoratorMetadata`
    // orqali chiqadigan `design:paramtypes` da HAQIQIY qiymatga
    // tayanadi — `import type` esa importni butunlay o'chirib
    // yuboradi. Natijada kod kompilyatsiya bo'ladi, testlar o'tadi,
    // lekin server ishga tushganda DI "undefined" bo'lib qulaydi.
    //
    // Shuning uchun bu qoida NestJS ilovasida o'chiriladi.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
);
