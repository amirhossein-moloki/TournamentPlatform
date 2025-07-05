module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn', // Avoid console.log in production
    'no-undef': 'error',
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    'keyword-spacing': ['error', { before: true, after: true }],
    'arrow-spacing': ['error', { before: true, after: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'max-len': [
      'warn',
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    // Best Practices
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-param-reassign': 'warn', // Can be 'error' for stricter immutability
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-useless-catch': 'warn',
    'no-with': 'error',
    'handle-callback-err': 'warn', // Node.js specific: ensure errors in callbacks are handled
    'no-empty-function': ['error', { allow: ['arrowFunctions', 'methods'] }], // Allow empty arrow functions or methods if needed
    'consistent-return': 'warn', // Prefer explicit returns or no returns
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off', // Chai/expect often use these
      },
    },
    {
      files: ['db/migrations/*.js', 'db/seeders/*.js'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: 'queryInterface|Sequelize' }],
        // Migration files often don't use all parameters
      },
    },
  ],
};
