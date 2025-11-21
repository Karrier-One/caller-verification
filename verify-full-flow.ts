#!/usr/bin/env ts-node
/**
 * Full Flow Verification Script
 *
 * This script demonstrates the complete verification flow for a signed JWT within a
 * STIR/SHAKEN-like system that leverages Sui blockchain and KNS infrastructure.
 *
 * The verification flow includes the following steps:
 *
 * 1. JWT Lookup:
 *    - The script reads a signed JWT from a file specified via the command line.
 *
 * 2. JWT Decoding:
 *    - It decodes the JWT (without verifying its signature) to extract the header and payload.
 *    - From the header, it extracts the key ID (using either "keyid" or "kid").
 *    - From the payload, it retrieves the originating telephone number (under the `orig.tn` field).
 *
 * 3. Public Key Retrieval via Phone Number Lookup:
 *    - Using the phone number, the script makes an API call (to a KNS API endpoint) to retrieve an
 *      associated Sui object ID.
 *    - It then queries the KNS ID Map Table (via a GraphQL query) to retrieve an array of values linked
 *      to that object ID.
 *    - For each value, the script fetches the corresponding Sui object and extracts public key information.
 *    - This produces a list of public keys (each with a key ID and the public key string).
 *
 * 4. PEM Formatting:
 *    - The helper function `formatPEM` ensures that the public key is in valid PEM format.
 *    - If the key is not already formatted with the appropriate PEM headers and footers, it inserts them,
 *      along with appropriate line breaks.
 *
 * 5. JWT Verification:
 *    - The script identifies the public key that matches the key ID from the JWT header.
 *    - Using this matching public key (formatted in PEM), it verifies the JWT signature with the ES256 algorithm.
 *
 * Environment Variables:
 *   - KNS_ID_MAP_TABLE_ID: The Sui object ID for the KNS ID Map Table (required).
 *   - SUI_NETWORK: The Sui network to target ("testnet" or "mainnet") (optional, defaults to mainnet).
 *   - KNS_API_BASE_URL: The base URL for the KNS API to look up object IDs by phone number (required).
 *   - KNS_API_KEY: The API key for accessing the KNS API (required).
 *
 * Usage:
 *   ts-node ./verify-full-flow.ts <jwtFile> [--network <mainnet|testnet>]
 *
 * Arguments:
 *   <jwtFile>: Path to the file containing the signed JWT to be verified.
 *
 * Options:
 *   --network <mainnet|testnet>  Override network selection (priority: CLI arg > .env > mainnet)
 *
 * Examples:
 *   ts-node ./verify-full-flow.ts ./es256-signed.jwt
 *   ts-node ./verify-full-flow.ts ./es256-signed.jwt --network testnet
 *
 * The script will log the following:
 *   - The decoded JWT header and payload.
 *   - The key ID extracted from the JWT.
 *   - Details of the public key retrieved (via phone number lookup).
 *   - Whether JWT verification succeeded or failed.
 */

import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import jwt from 'jsonwebtoken';

dotenv.config(); // Load environment variables

// Parse command line arguments for network (--network <mainnet|testnet>)
const args = process.argv.slice(2);
const networkIndex = args.indexOf('--network');
const network = (networkIndex !== -1 && args[networkIndex + 1])
  ? args[networkIndex + 1] as "mainnet" | "testnet"
  : "mainnet";

// Validate network value
if (network !== 'mainnet' && network !== 'testnet') {
  console.error('Error: --network must be either "mainnet" or "testnet"');
  process.exit(1);
}

console.log(`🌐 Using network: ${network}`);

// Helper to get network-specific environment variable
const getEnvVar = (varName: string): string => {
  const networkPrefix = network.toUpperCase();
  const value = process.env[`${networkPrefix}_${varName}`];
  if (!value) {
    throw new Error(`Environment variable ${networkPrefix}_${varName} is not set`);
  }
  return value;
};

// Retrieve network-specific environment variables
const knsIdMapTableId = getEnvVar('KNS_ID_MAP_TABLE_ID');
const knsApiBaseUrl = getEnvVar('KNS_API_BASE_URL');
const knsApiKey = getEnvVar('KNS_API_KEY');

// Instantiate the GraphQL client using the proper Sui network endpoint.
const gqlClient = new SuiGraphQLClient({
	url: `https://graphql.${network}.sui.io/graphql`,
});

interface PublicKeySuiObject {
	type: string;
	fields: PublicKNSKey;
}

interface PublicKNSKey {
	key_id: string;
	public_key: string;
}

/**
 * Formats a public key string into PEM format.
 *
 * If the key already includes PEM headers, it is returned as-is.
 * Otherwise, extraneous whitespace is removed, line breaks are inserted every 64 characters,
 * and the PEM header and footer are added.
 *
 * @param key - The public key string.
 * @returns The key formatted in PEM.
 */
function formatPEM(key: string): string {
	if (key.includes('-----BEGIN PUBLIC KEY-----')) {
	  return key;
	}
	key = key.replace(/(\r\n|\n|\r)/gm, '');
	const formattedKey = key.match(/.{1,64}/g)?.join('\n') || key;
	return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
}

/**
 * GraphQL query to fetch dynamic fields from the KNS ID Map Table address.
 */
const chainIdentifierQuery = graphql(`
query ($id: SuiAddress!) {
  address(address: $id) {
    dynamicFields {      
      nodes {            
        name { json }
        value {
          ... on MoveValue {
            json
          }
          ... on MoveObject {
            contents {
              json
            }
          }
        }
      }
    }
  }
}`);

/**
 * Queries the KNS ID Map Table for a given name.
 *
 * This function sends a GraphQL query to fetch the dynamic fields of the KNS ID Map Table address,
 * then searches for a node with a name matching the provided value.
 *
 * @param name - The name to search for (typically an object ID).
 * @returns A promise resolving to an array of strings if found, or null if not.
 */
async function knsIdMapTable(name: string): Promise<string[] | null> {
	const result = await gqlClient.query({
		query: chainIdentifierQuery,
		variables: { id: knsIdMapTableId },
	});
	const nodes = result.data?.address?.dynamicFields?.nodes;
	const match = nodes?.find((node: any) => node.name.json === name);

	if (!match) {
		throw new Error(`No matching entry found for name: ${name}`);
	}
	return (match.value as { json: string[] })?.json;
}

/**
 * Retrieves a Sui object by its ID.
 *
 * This function creates a Sui client instance and queries for an object,
 * including its full content.
 *
 * @param objectId - The ID of the Sui object.
 * @returns A promise resolving to the Sui object details.
 */
async function getSuiObject(objectId: string) {
	const client = new SuiClient({ url: getFullnodeUrl(network) });
	const objectOwner = await client.getObject({
		id: objectId,
		options: {
			showContent: true,
		},
	});
	return objectOwner;
}

/**
 * Looks up public keys associated with a phone number.
 *
 * This function performs the following:
 *   1. Uses the provided phone number to make an API call (to the KNS API) to obtain an associated object ID.
 *   2. Queries the KNS ID Map Table (via GraphQL) using the object ID as a key.
 *   3. For each value returned, fetches the corresponding Sui object and extracts public key data.
 *
 * @param phoneNumber - The originating phone number in E.164 format.
 * @returns A promise resolving to an array of public key objects.
 */
async function lookupPublicKey(phoneNumber: string): Promise<PublicKNSKey[]> {
	// Perform API call to retrieve objectId for the phone number.
	const response = await axios.post(
		`${knsApiBaseUrl}/kns/object-id-lookup`,
		{ phoneNumber },
		{
			headers: {
				'x-api-key': knsApiKey,
				'Content-Type': 'application/json',
			},
		}
	);

	const objectId = response.data.objectId;
	if (!objectId) {
		throw new Error('No objectId found for the given phone number.');
	}

	console.log(`Object ID retrieved: ${objectId}`);

	// Look up the value in the KNS ID Map Table using the objectId as the key.
	const value = await knsIdMapTable(objectId);
	if (!value) {
		throw new Error('No value found in the table for the given objectId.');
	}

	console.log(`Value found in the table: ${value}`);

	// Retrieve and collect public keys from the corresponding Sui objects.
	let ret: PublicKNSKey[] = [];
	for (let i = 0; i < value.length; i++) {
		const suiObject = await getSuiObject(value[i]);
		const publicKeys = (suiObject?.data?.content as any)?.fields?.public_keys as PublicKeySuiObject[];
		if (!publicKeys) {
			throw new Error('No public key found in the Sui object.');
		}

		console.log(`Public Key retrieved: ${JSON.stringify(publicKeys)}`);
		for (let j = 0; j < publicKeys.length; j++) {
			ret.push(publicKeys[j].fields);
		}
	}	
	return ret;
}

/**
 * Verifies a JWT using the public key obtained via phone number lookup.
 *
 * The function performs the following steps:
 *   1. Reads the signed JWT from the specified file.
 *   2. Decodes the JWT (without verifying) to extract the header and payload.
 *   3. Extracts the key ID from the header and the originating phone number from the payload.
 *   4. Looks up the public keys associated with the phone number.
 *   5. Searches for a public key that matches the key ID.
 *   6. Formats the matching public key into PEM format and uses it to verify the JWT.
 *
 * @param jwtFile - Path to the file containing the signed JWT.
 */
async function verifyJwt(jwtFile: string) {
    try {
        // Read the signed JWT from the file.
        const token = await fs.promises.readFile(jwtFile, 'utf8');

        // Decode the JWT without verification.
        const decoded = jwt.decode(token, { complete: true });
        if (decoded) {
            console.log(decoded);
			const header = decoded.header as any;
			const tokenKeyId = header?.keyid ?? header?.kid;
			if (!tokenKeyId) {
				console.error('No key ID found in the JWT header.');
				return;
			}	
			console.log('Key ID:', tokenKeyId);	
			
            // Retrieve the originating phone number from the JWT payload.
            let phoneNumber = (decoded.payload as any)?.orig?.tn;
            // Look up the associated public keys using the phone number.
            const publicKeys = await lookupPublicKey(phoneNumber);
			const matchingKey = publicKeys.find(key => key.key_id === tokenKeyId);
			if (!matchingKey) {
				console.error('No matching key found for the token key ID.');
				return;
			}
			console.log('Matching Key:', matchingKey);
            try {
				// Verify the JWT using the matching public key (formatted in PEM).
				let verifiedPayload = jwt.verify(token, formatPEM(matchingKey.public_key), { algorithms: ['ES256'] });
				console.log('Verification succeeded with matching key');
				return;
			} catch (error: any) {
				console.log('Verification failed with matching key');
			}
        } else {
            console.error('Failed to decode the JWT.');
        }    
	} catch (error: any) {
		console.error('Verification Failed:', error.message);
	}
}

/**
 * Main entry point.
 *
 * This function expects a single command-line argument:
 *   <jwtFile>: The path to the file containing the signed JWT.
 * It initiates the verification process by calling verifyJwt.
 */
async function main() {
	// Read JWT file from command line arguments (filter out --network flag)
	const jwtFile = args.find((arg, index) => {
		// Skip if it's a flag
		if (arg.startsWith('--')) return false;
		// Skip if it's the value after --network flag
		if (networkIndex !== -1 && index === networkIndex + 1) return false;
		// This is the JWT file
		return true;
	});

	if (!jwtFile) {
		console.error('Usage: ts-node ./verify-full-flow.ts <jwtFile> [--network <mainnet|testnet>]');
		process.exit(1);
	}

	try {
		await verifyJwt(jwtFile);
	} catch (error: any) {
		console.error('Error:', error.message);
	}
}

main();
