/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        hash-password.js
 * @brief       CLI utility to generate a password hash for users.json.
 *
 * @usage
 *   node lib/hash-password.js <plaintext-password>
 *
 * @example
 *   $ node lib/hash-password.js admin123
 *   → $2b$12$LQ3c1yq...
 *
 *   Copy the output into users.json → passwordHash field.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const { hashPassword } = require('./auth-service');

(async () => {
    const pw = process.argv[2];
    if (!pw || pw.length < 6) {
        console.error('Usage: node lib/hash-password.js <password (min 6 chars)>');
        process.exit(1);
    }
    try {
        const hash = await hashPassword(pw);
        console.log('\nPassword hash generated:\n');
        console.log(hash);
        console.log('\nCopy this into users.json → passwordHash field.\n');
    } catch (err) {
        console.error('Hashing failed:', err.message);
        process.exit(1);
    }
})();