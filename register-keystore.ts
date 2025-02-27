#!/usr/bin/env ts-node
/**
 * Register Keystore Script
 *
 * This script interacts with the Sui blockchain to register a new keystore.
 * It constructs, signs, and executes a transaction that calls the `register_keystore`
 * function in the keystore module of the specified package.
 *
 * Environment Variables:
 *   - KEYSTORE_PACKAGE_ID: The package ID containing the keystore module (required).
 *   - SUI_NETWORK: The Sui network to target ("testnet" or "mainnet") (required).
 *
 * Command-line Arguments:
 *   <publicKeyFile>   - Path to the file containing the public key (keystore value) to register.
 *   <name>            - Name/version of the keystore (e.g., "Keystore v1").
 *   <creator>         - Creator/organization name (e.g., "Karrier One").
 *   <imageUrl>        - URL for the keystore image.
 *   <rawPrivateKey>   - A base64-encoded raw private key string used for signing.
 *
 * Usage:
 *   ts-node ./register-keystore.ts <publicKeyFile> <name> <creator> <imageUrl> <rawPrivateKey>
 *
 * Example:
 *   ts-node ./register-keystore.ts ./public_key.pem "Keystore v1" "Karrier One" "https://placehold.co/600x600.png?text=Keystore" "base64EncodedPrivateKey"
 *
 * Process:
 *   1. Reads the public key from the specified file.
 *   2. Reads additional parameters (name, creator, image URL) from the command line.
 *   3. Decodes the base64-encoded private key, removes the first byte, and creates an Ed25519 keypair.
 *   4. Constructs a transaction that:
 *       - Creates an empty vector map and inserts a test key/value pair.
 *       - Creates a vector containing the keystore public key read from the file.
 *       - Invokes the `register_keystore` Move call with the provided parameters.
 *   5. Signs and executes the transaction on the Sui blockchain.
 *   6. Waits for transaction confirmation and logs the transaction details and any created objects.
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config(); // Load environment variables from .env file

// Check for required command-line arguments.
if (process.argv.length < 7) {
  console.error("Usage: ts-node ./register-keystore.ts <publicKeyFile> <name> <creator> <imageUrl> <rawPrivateKey>");
  process.exit(1);
}

// Command-line arguments:
//   <publicKeyFile>: Path to the file containing the public key to register.
const publicKeyFile = process.argv[2];
//   <name>: Keystore name/version.
const name = process.argv[3];
//   <creator>: Organization or creator name.
const creator = process.argv[4];
//   <imageUrl>: URL for the keystore image.
const imageUrl = process.argv[5];
//   <rawPrivateKey>: Base64-encoded raw private key for signing.
const raw = fromBase64(process.argv[6]);

// Read the public key from the specified file.
let publicKeyStr: string;
try {
  publicKeyStr = fs.readFileSync(publicKeyFile, "utf8").trim();
} catch (error: any) {
  console.error(`Error reading public key file "${publicKeyFile}": ${error.message}`);
  process.exit(1);
}

// Generate an Ed25519 keypair by decoding the provided private key (remove the first byte).
const keypair = Ed25519Keypair.fromSecretKey(raw.slice(1));

// Environment variable:
//   KEYSTORE_PACKAGE_ID: The package ID for the keystore module.
const packageId = process.env.KEYSTORE_PACKAGE_ID!;

async function register_keystore() {
  // Initialize the Sui client with the fullnode URL for the specified network.
  const client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK! as "testnet" | "mainnet") });
  
  // Create a new transaction builder.
  const txb = new Transaction();
  
  // Log the target Move call for debugging.
  console.log(`${packageId}::keystore::register_keystore`);
  
  // Create an empty vector map using the Move module function for vec_map::empty.
  const vecMap = txb.moveCall({
    target: "0x2::vec_map::empty",
    typeArguments: ["0x1::string::String", "0x1::string::String"],
  });
  
  // Insert a test key-value pair into the vector map.
  txb.moveCall({
    target: "0x2::vec_map::insert",
    arguments: [vecMap, txb.pure.string("test_key"), txb.pure.string("test_value")],
    typeArguments: ["0x1::string::String", "0x1::string::String"],
  });
  
  // Create a vector containing the public key read from the file.
  const vec = txb.makeMoveVec({
    type: "0x1::string::String",
    elements: [ txb.pure.string(publicKeyStr) ],
  });
  
  // Construct the Move call to register the keystore.
  txb.moveCall({
    target: `${packageId}::keystore::register_keystore`,
    arguments: [
      vec,                           // Vector of keystore values (public key)
      txb.pure.string(imageUrl),     // Image URL
      txb.pure.string(name),         // Keystore name/version
      txb.pure.string(creator),      // Creator/organization name
      vecMap,                        // The vector map containing test key/value data
    ],
  });
  
  // Sign and execute the transaction.
  const tx = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txb,
    options: {
      showObjectChanges: true,
    }
  });
  
  // Wait for the transaction confirmation.
  const resp = await client.waitForTransaction({ digest: tx.digest });
  
  // Filter any object changes of type "created".
  const created = tx.objectChanges?.filter(change => change.type === "created") ?? [];
  
  // Log the transaction, any created objects, and the transaction response.
  console.log(tx);
  console.log(created);
  console.log(resp);
}

// Execute the keystore registration.
register_keystore();
