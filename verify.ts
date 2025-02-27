#!/usr/bin/env ts-node
/**
 * Verify JWT Script
 *
 * This script verifies a signed JWT using a provided public key.
 *
 * The verification process is as follows:
 *  1. Reads a signed JWT from a file.
 *  2. Reads a public key (in PEM format) from a file.
 *  3. Attempts to verify the JWT signature using the ES256 algorithm.
 *  4. If verification succeeds, the script decodes and prints the full JWT (header and payload).
 *  5. If verification fails, the script decodes the JWT (without verifying) and prints the error message.
 *
 * Command-line Arguments:
 *   <jwtFile>       - (Optional) Path to the file containing the signed JWT.
 *                     Default: "es256-signed.jwt"
 *   <publicKeyFile> - (Optional) Path to the file containing the public key in PEM format.
 *                     Default: "es256-public-key.pem"
 *
 * Usage:
 *   ts-node ./verify.ts [<jwtFile>] [<publicKeyFile>]
 *
 * Example:
 *   ts-node ./verify.ts es256-signed.jwt es256-public-key.pem
 *
 * Output:
 *   - If verification succeeds: The script prints the decoded JWT (header and payload) and "Verification Succeeded".
 *   - If verification fails: The script prints the decoded JWT along with an error message.
 */

import fs from 'fs';
import jwt from 'jsonwebtoken';

// Retrieve command-line arguments with defaults.
const jwtFile = process.argv[2] || 'es256-signed.jwt';
const publicKeyFile = process.argv[3] || 'es256-public-key.pem';

try {
  // Load the public key from the specified file.
  const publicKey = fs.readFileSync(publicKeyFile, 'utf8');

  // Read the signed JWT from the specified file.
  const token = fs.readFileSync(jwtFile, 'utf8');

  // Verify the JWT using the public key and ES256 algorithm.
  const verifiedPayload = jwt.verify(token, publicKey, { algorithms: ["ES256"] });

  // Decode the JWT (header and payload) to print the full details.
  const decoded = jwt.decode(token, { complete: true });
  if (decoded) {
    console.log(decoded);
  } else {
    console.error("Failed to decode the JWT.");
  }

  console.log("Verification Succeeded");
} catch (error: any) {
  // On verification failure, decode the JWT (without verifying) and print details along with the error message.
  const token = fs.readFileSync(jwtFile, 'utf8');
  const decoded = jwt.decode(token, { complete: true });
  if (decoded) {
    console.log(decoded);
  } else {
    console.error("Failed to decode the JWT.");
  }
  console.error("Verification Failed:", error.message);
}
