import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

// Base JavaScript/TypeScript configuration
const baseConfig = {
  plugins: {
    '@typescript-eslint': tseslint
  },
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    globals: {
      document: 'readonly',
      navigator: 'readonly',
      window: 'readonly'
    }
  },
  rules: {
    ...tseslint.configs.recommended.rules
  }
};

// Svelte configuration
const svelteConfig = {
  plugins: {
    svelte: sveltePlugin
  },
  processor: sveltePlugin.processors['.svelte'],
  files: ['**/*.svelte'],
  languageOptions: {
    parser: svelteParser,
    parserOptions: {
      parser: tsParser
    }
  },
  rules: {
    ...sveltePlugin.configs.recommended.rules
  }
};

// Default ignore patterns
const ignores = {
  ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.svelte-kit/**', '**/package/**']
};

export default [ignores, baseConfig, svelteConfig];
