'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        files: ['server.js', 'lib/**/*.js', 'test/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: globals.node },
        rules: {
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
        },
    },
];
