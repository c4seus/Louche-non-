import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateKeyPair } = require('./feed-lib.js');

const { privateKeyPem, publicKey } = generateKeyPair();

console.log('1. GitHub secret FEED_SIGNING_KEY (Settings > Secrets and variables > Actions), paste everything between the lines:');
console.log('=====');
console.log(privateKeyPem.trim());
console.log('=====');
console.log('');
console.log('2. Public key, to paste into FEED_PUBLIC_KEY in src/config.ts:');
console.log(publicKey);
console.log('');
console.log('Keep a copy of the private key in your password manager. Never commit it.');
