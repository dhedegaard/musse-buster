import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  ...compat.extends(
    'plugin:@typescript-eslint/strict-type-checked',
    'next/core-web-vitals',
    'prettier',
    'plugin:tailwindcss/recommended'
  ),
  {
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'assert'],
        },
      ],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'prefer-const': 'error',
    },
  },
  eslintPluginUnicorn.configs.all,
  {
    rules: {
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            props: true,
            Props: true,
            ref: true,
          },
        },
      ],
    },
  },
]
