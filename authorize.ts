#!/usr/bin/env ts-node
/**
 * STIR/SHAKEN JWT Signer (TypeScript)
 *
 * This script signs a STIR/SHAKEN JWT using an ES256 private key.
 * The JWT payload includes:
 *   - orig: the originating number (caller ID)
 *   - dest: the destination number
 *   - iat: the issued-at timestamp (in seconds)
 *   - att: the attestation level (A = Full, B = Partial, C = Gateway)
 *   - origid: a unique identifier for the call
 *
 * The script derives the public key from the supplied private key, computes a key identifier (keyId)
 * from it, and then signs the JWT using the ES256 algorithm.
 *
 * Usage:
 *   ts-node sign-jwt.ts <origTN> <destTN> <origid> <privateKeyFile> <jwtFile>
 *
 * Parameters:
 *   origTN         - Originating telephone number (caller ID) in E.164 format.
 *   destTN         - Destination telephone number in E.164 format.
 *   origid         - Unique identifier for the call.
 *   privateKeyFile - Path to the ES256 private key PEM file.
 *   jwtFile        - Path where the signed JWT will be saved.
 *
 * Example:
 *   ts-node authorize.ts "+15551234567" "+14445556789" "abcdef123456" "es256-private-key.pem" "signed.jwt"
 *
 * Note: This script requires Node.js and ts-node to be installed.
 */

import * as fs from 'fs';
import jwt from 'jsonwebtoken';
import { createHash, createPublicKey } from 'crypto';

// Ensure the correct number of command-line arguments are provided
if (process.argv.length < 7) {
  console.error("Usage: ts-node sign-jwt.ts <origTN> <destTN> <origid> <privateKeyFile> <jwtFile>");
  process.exit(1);
}

// Retrieve command-line arguments
const origTN: string = process.argv[2];
const destTN: string = process.argv[3];
const origid: string = process.argv[4];
const privateKeyFile: string = process.argv[5];
const jwtFile: string = process.argv[6];

// Load the private key from the specified file
let privateKey: string;
try {
  privateKey = fs.readFileSync(privateKeyFile, 'utf8');
} catch (error: any) {
  console.error(`Error reading private key file "${privateKeyFile}": ${error.message}`);
  process.exit(1);
}

// Derive the public key from the private key and export it in PEM format
let publicKeyPem: string;
try {
  publicKeyPem = createPublicKey(privateKey)
    .export({ type: 'spki', format: 'pem' })
    .toString();
} catch (error: any) {
  console.error(`Error deriving public key from the provided private key: ${error.message}`);
  process.exit(1);
}

/**
 * Generates a 32-character key ID from the provided public key PEM.
 *
 * @param publicKeyPem - The public key in PEM format.
 * @returns A 32-character string (128 bits) as the key identifier.
 */
function generateKeyId(publicKeyPem: string): string {
  // Normalize the key by removing the header, footer, and any whitespace
  const normalizedKey = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  
  // Compute a SHA-256 hash of the normalized key and convert it to hexadecimal
  const hash = createHash('sha256').update(normalizedKey).digest('hex');
  
  // Return the first 32 characters (128 bits)
  return hash.substring(0, 32);
}

const keyId = generateKeyId(publicKeyPem);
console.log('Generated Key ID:', keyId);

// Construct the STIR/SHAKEN JWT payload
const payload = {
  orig: { tn: origTN },                 // Originating number (caller ID)
  dest: { tn: destTN },                 // Destination number
  iat: Math.floor(Date.now() / 1000),    // Issued-at timestamp (seconds)
  att: 'A',                            // Attestation level (A = Full, B = Partial, C = Gateway)
  origid: origid,                      // Unique call identifier
};

// JWT header options, using the computed keyId
const jwtOptions: jwt.SignOptions = {
  algorithm: 'ES256',
  keyid: keyId,
};

// Sign the JWT using the provided private key
let token: string;
try {
  token = jwt.sign(payload, privateKey, jwtOptions);
} catch (error: any) {
  console.error(`Error signing JWT: ${error.message}`);
  process.exit(1);
}

// Write the signed JWT to the specified file
try {
  fs.writeFileSync(jwtFile, token, 'utf8');
  console.log(`Signed JWT saved to ${jwtFile}`);
} catch (error: any) {
  console.error(`Error writing JWT to file "${jwtFile}": ${error.message}`);
  process.exit(1);
}
