/**
 * 🛡️ WEDSYNC ENTERPRISE ESLINT CONFIGURATION
 * Guardian-Designed for 4M LOC Wedding Platform
 * 
 * CRITICAL REQUIREMENTS:
 * - Zero tolerance for TypeScript errors in payment processing
 * - Wedding-day reliability for Saturday deployments
 * - Mobile-first optimization for vendor workflows
 * - Performance optimized for massive codebase scale
 * 
 * Last Updated: 2025-01-14 - Guardian Configuration
 */

// @ts-check
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base JavaScript recommendations
  js.configs.recommended,

  // === WEDDING PLATFORM CORE CONFIGURATION ===
  {
    name: 'wedsync-enterprise/base',
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // 🚀 PERFORMANCE CRITICAL: Use Project Service v8 (5x faster)
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
          generators: true,
          objectRestSpread: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
        },
      },
    },
  },

  // === TYPESCRIPT ENTERPRISE RULES ===
  {
    name: 'wedsync-enterprise/typescript',
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // 🚨 ZERO TOLERANCE - Wedding Platform Security
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // 💰 PAYMENT PROCESSING SAFETY
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
        allowNullableBoolean: false,
        allowNullableString: false,
        allowNullableNumber: false,
        allowAny: false,
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // 🏗️ ARCHITECTURE ENFORCEMENT
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: {
          attributes: false,
        },
      }],

      // 📱 MOBILE OPTIMIZATION
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-readonly': 'error',

      // 🔄 ASYNC SAFETY (Wedding Day Critical)
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/no-void': ['error', { allowAsStatement: true }],

      // 🎯 PERFORMANCE OPTIMIZATION  
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',

      // 🚫 FORBIDDEN PATTERNS
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': false,
        'ts-check': false,
        minimumDescriptionLength: 10,
      }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Override default eslint rules with TypeScript versions
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
    },
  },

  // === REACT & NEXT.JS ENTERPRISE RULES ===
  {
    name: 'wedsync-enterprise/react',
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      // React Core
      'react/prop-types': 'off', // TypeScript handles this
      'react/react-in-jsx-scope': 'off', // Next.js auto-import
      'react/display-name': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/require-render-return': 'error',

      // 🚀 PERFORMANCE (Wedding Platform Critical)
      'react/jsx-no-bind': ['error', {
        ignoreRefs: true,
        allowArrowFunctions: true,
        allowBind: false,
        allowFunctions: false,
      }],
      'react/no-array-index-key': 'warn', // Wedding lists need stable keys
      'react/jsx-no-leaked-render': 'error',

      // 📱 MOBILE ACCESSIBILITY (60% mobile users)
      'react/jsx-no-target-blank': ['error', { 
        enforceDynamicLinks: 'always',
        warnOnSpreadAttributes: true,
      }],

      // React Hooks (Wedding State Management)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': ['error', {
        additionalHooks: '(useAsyncEffect|useInterval)',
      }],

      // Next.js Optimizations
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-title-in-document-head': 'error',
    },
  },

  // === IMPORT MANAGEMENT & ARCHITECTURE ===
  {
    name: 'wedsync-enterprise/imports',
    plugins: {
      'import': importPlugin,
    },
    rules: {
      // 🏗️ ARCHITECTURE ENFORCEMENT
      'import/order': ['error', {
        groups: [
          'builtin',
          'external', 
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: 'next/**',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      }],

      // 🔒 SECURITY & RELIABILITY
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': ['error', { maxDepth: 10 }],
      'import/no-useless-path-segments': ['error', { commonjs: true }],

      // 📦 PERFORMANCE 
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/first': 'error',
      'import/newline-after-import': 'error',

      // 🚫 FORBIDDEN IMPORTS (Wedding Platform Security)
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './src/app/api/**/*',
            from: './src/components/**/*',
            message: 'API routes should not import client components',
          },
          {
            target: './src/components/**/*',
            from: './src/app/api/**/*',
            message: 'Client components should not import API routes',
          },
        ],
      }],
    },
  },

  // === WEDDING PLATFORM SECURITY RULES ===
  {
    name: 'wedsync-enterprise/security',
    rules: {
      // 💰 PAYMENT PROCESSING SECURITY
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-alert': 'error',
      'no-confirm': 'error',

      // 🔒 DATA PROTECTION (GDPR/Wedding Privacy)
      'no-console': ['warn', { 
        allow: ['warn', 'error'],
      }],
      'no-debugger': 'error',

      // 🛡️ RUNTIME SAFETY
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-backreference': 'error',
      
      // 🎯 CODE QUALITY
      'prefer-const': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      'prefer-template': 'error',
      'radix': 'error',
      'require-atomic-updates': 'error',
    },
  },

  // === WEDDING PLATFORM PERFORMANCE RULES ===
  {
    name: 'wedsync-enterprise/performance',
    rules: {
      // 📱 MOBILE PERFORMANCE (60% mobile usage)
      'no-await-in-loop': 'error',
      'no-inner-declarations': 'error',
      'no-regex-spaces': 'error',
      'prefer-object-spread': 'error',

      // 🚀 MEMORY OPTIMIZATION
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',

      // 🔄 ASYNC OPTIMIZATION
      'no-return-await': 'off', // Handled by @typescript-eslint/return-await
      'require-await': 'off', // Handled by TypeScript
    },
  },

  // === FILE-SPECIFIC CONFIGURATIONS ===
  
  // API Routes (Payment Security Critical)
  {
    name: 'wedsync-enterprise/api-routes',
    files: ['src/app/api/**/*.ts', 'src/pages/api/**/*.ts'],
    rules: {
      // 💰 PAYMENT API SECURITY
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      'no-console': ['error', { allow: ['error'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      
      // 🔒 SERVER-SIDE SECURITY
      'import/no-dynamic-require': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  // Stripe Integration (Zero Tolerance)
  {
    name: 'wedsync-enterprise/stripe-integration',
    files: ['**/stripe/**/*.ts', '**/payment/**/*.ts'],
    rules: {
      // 💳 PAYMENT PROCESSING ZERO TOLERANCE
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      'no-console': 'error',
    },
  },

  // Mobile Components (Performance Critical)
  {
    name: 'wedsync-enterprise/mobile-components',
    files: ['**/mobile/**/*.tsx', '**/components/**/*Mobile*.tsx'],
    rules: {
      // 📱 MOBILE PERFORMANCE
      'react/jsx-no-bind': 'error',
      'react/no-array-index-key': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      'prefer-const': 'error',
    },
  },

  // === IGNORED FILES (PERFORMANCE OPTIMIZATION) ===
  {
    name: 'wedsync-enterprise/ignores',
    ignores: [
      // Build outputs
      '.next/**/*',
      'out/**/*',
      'dist/**/*',
      'build/**/*',
      
      // Dependencies
      'node_modules/**/*',
      
      // Test files (separate linting)
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**/*',
      '**/*test*/**/*',
      'tests/**/*',
      'benchmarks/**/*',
      'playwright*/**/*',
      
      // Configuration files
      '*.config.{js,mjs,ts}',
      'tailwind.config.*',
      'postcss.config.*',
      
      // Documentation
      'docs/**/*',
      'WORKFLOW*/**/*',
      'EVIDENCE*/**/*',
      
      // Generated files
      'src/types/database.types.ts',
      '.serena/**/*',
      'coverage/**/*',
      'test-results/**/*',
      
      // Supabase
      'supabase/functions/**/*',
      '.supabase/**/*',
      
      // Legacy files
      '**/*.js.backup',
      '**/*.bak',
    ],
  },
];