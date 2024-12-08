
const eslint = require('@eslint/js')
const globals = require('globals')
const tseslint = require('typescript-eslint')

const rulesConfig = [
  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          'vars': 'all',
          'args': 'after-used',
          'ignoreRestSiblings': true,
          'varsIgnorePattern': '^_', // Ignore variables that start with _
          'argsIgnorePattern': '^_'  // Ignore arguments that start with _
        }
      ],
      'no-undef': 'warn',
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]

const ignoresConfig = [{ ignores: ['dist', 'bin', 'eslint.config.cjs', 'coverage'] }]

module.exports = [
  {
    files: ['**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...rulesConfig,
  ...ignoresConfig,
]
