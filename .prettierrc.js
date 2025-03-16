module.exports = {
  tabWidth: 2,
  singleQuote: true,
  semi: true,
  trailingComma: 'none',
  printWidth: 120,
  endOfLine: 'auto',
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-svelte'],
  organizeImportsSkipDestructiveCodeActions: true,
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
        svelteIndentScriptAndStyle: true,
        svelteSortOrder: 'options-scripts-markup-styles',
        svelteStrictMode: false,
        svelteAllowShorthand: true,
        htmlWhitespaceSensitivity: 'ignore'
      }
    }
  ]
};
