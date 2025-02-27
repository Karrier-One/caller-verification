#!/usr/bin/env ts-node
/**
 * Public Key ID Generator
 *
 * This script generates a unique key identifier from a given public key PEM file.
 * It reads the public key from the specified file, normalizes its content by removing
 * the header, footer, and whitespace, then computes a SHA‑256 hash. The hash is truncated
 * to the first 32 characters to serve as a 128‑bit identifier.
 *
 * Usage:
 *   ts-node generate-key-id.ts <public-key-file.pem>
 *
 * Examples:
 *   ts-node generate-key-id.ts es256-public-key-1634023200.pem
 *
 * Output:
 *   Generated Key ID: <key-id>
 */

import { createHash } from "crypto";
import * as fs from "fs";

/**
 * Generates a 128‑bit key identifier from a given public key PEM string.
 *
 * @param publicKeyPem - The public key in PEM format.
 * @returns A 32‑character string representing the first 128 bits of the SHA‑256 hash.
 */
function generateKeyId(publicKeyPem: string): string {
  // Remove header, footer, and any whitespace
  const normalizedKey = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");

  // Create a SHA‑256 hash of the normalized key
  const hash = createHash("sha256").update(normalizedKey).digest("hex");

  // Truncate the hash to the first 32 characters (for a 128‑bit identifier)
  return hash.substring(0, 32);
}

// Retrieve the filename from the first command‑line argument
const publicKeyFilename = process.argv[2];
if (!publicKeyFilename) {
  console.error("Usage: ts-node generate-key-id.ts <public-key-file.pem>");
  process.exit(1);
}

// Read the public key PEM from the specified file with error handling
let publicKeyPem: string;
try {
  publicKeyPem = fs.readFileSync(publicKeyFilename, "utf8");
} catch (error: any) {
  console.error(`Error reading file "${publicKeyFilename}": ${error.message}`);
  process.exit(1);
}

// Generate the key identifier and output the result
const keyId = generateKeyId(publicKeyPem);
console.log("Generated Key ID:", keyId);
