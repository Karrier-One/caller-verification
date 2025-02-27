#!/usr/bin/env ts-node
/**
 * ES256 Key Pair Generator Script (TypeScript)
 *
 * This script generates an ES256 key pair (ECDSA using the P-256 curve) and writes the keys to files.
 * It accepts optional command‑line parameters to specify custom filenames for the private and public keys.
 * If no filenames are provided, default filenames based on the current Unix timestamp are used.
 *
 * Usage:
 *   ts-node generate-key.ts [--private <privateKeyFilename>] [--public <publicKeyFilename>]
 *
 * Examples:
 *   ts-node generate-key.ts
 *     - Generates keys and saves them to default filenames like:
 *       es256-private-key-<timestamp>.pem and es256-public-key-<timestamp>.pem
 *
 *   ts-node generate-key.ts --private myPrivate.pem --public myPublic.pem
 *     - Generates keys and saves them to "myPrivate.pem" and "myPublic.pem"
 */

import * as fs from 'fs';
import { generateKeyPairSync } from 'crypto';

// Retrieve command-line arguments (excluding the first two default args)
const args: string[] = process.argv.slice(2);

// Display help message if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log("Usage: ts-node generate-key.ts [--private <privateKeyFilename>] [--public <publicKeyFilename>]");
  process.exit(0);
}

/**
 * Retrieves the value following a given flag from the command-line arguments.
 * Exits with an error if the flag is present but missing a value.
 *
 * @param flag - The command-line flag (e.g., "--private")
 * @returns The value provided after the flag, or null if not present.
 */
function getArgValue(flag: string): string | null {
  const index: number = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    const value = args[index + 1];
    if (value.startsWith('--')) {  // next argument is another flag, not a value
      console.error(`Error: Missing value for ${flag}`);
      process.exit(1);
    }
    return value;
  }
  return null;
}

// Retrieve optional filenames from command-line arguments
let privateKeyFile: string | null = getArgValue('--private');
let publicKeyFile: string | null = getArgValue('--public');

// Validate that provided filenames are not empty strings
if (privateKeyFile !== null && privateKeyFile.trim() === '') {
  console.error("Error: Provided private key filename is empty.");
  process.exit(1);
}
if (publicKeyFile !== null && publicKeyFile.trim() === '') {
  console.error("Error: Provided public key filename is empty.");
  process.exit(1);
}

// Generate a Unix timestamp for default filenames if none provided
const timestamp: number = Math.floor(Date.now() / 1000);
if (!privateKeyFile) {
  privateKeyFile = `es256-private-key-${timestamp}.pem`;
}
if (!publicKeyFile) {
  publicKeyFile = `es256-public-key-${timestamp}.pem`;
}

// Generate an ES256 key pair using the P-256 curve
const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256', // Required for ES256
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Write the private key to a file with error handling
try {
  fs.writeFileSync(privateKeyFile, privateKey, { encoding: 'utf8' });
  console.log(`Private key saved to ${privateKeyFile}`);
} catch (err: any) {
  console.error(`Error writing private key to file: ${err.message}`);
  process.exit(1);
}

// Write the public key to a file with error handling
try {
  fs.writeFileSync(publicKeyFile, publicKey, { encoding: 'utf8' });
  console.log(`Public key saved to ${publicKeyFile}`);
} catch (err: any) {
  console.error(`Error writing public key to file: ${err.message}`);
  process.exit(1);
}
