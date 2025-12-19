const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'max-len': ['error', { code: 100 }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
