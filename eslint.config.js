const tseslint = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

module.exports = [
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'never'],
        },
    },
    {
        files: ['src/**/*.ts'],
        rules: {
            'max-len': ['error', { code: 120, ignoreComments: true }],
        },
    },
]
