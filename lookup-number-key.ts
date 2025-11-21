#!/usr/bin/env ts-node
/**
 * SUI KNS Object Lookup Script
 *
 * This script retrieves SUI object information based on a provided phone number in E.164 format.
 * It performs the following steps:
 *   1. Reads a phone number from the command line arguments.
 *   2. Makes an API call to retrieve the associated object ID for the phone number.
 *   3. Queries the KNS ID Map Table (via GraphQL) to obtain additional values using the object ID.
 *   4. For each value returned, retrieves the corresponding SUI object and logs its public keys.
 *
 * Requirements:
 * - A .env file containing environment variables:
 *    - SUI_NETWORK: "testnet" or "mainnet" (optional, defaults to mainnet)
 *    - KNS_ID_MAP_TABLE_ID: The table ID for the KNS ID map.
 *
 * Usage:
 *   ts-node ./lookup-number-key.ts <phoneNumber> [--network <mainnet|testnet>]
 *
 * Arguments:
 *   <phoneNumber> - A phone number in E.164 format (e.g., "+15551234567").
 *
 * Options:
 *   --network <mainnet|testnet>  Override network selection (priority: CLI arg > .env > mainnet)
 *
 * Example:
 *   ts-node ./lookup-number-key.ts "+15551234567"
 *   ts-node ./lookup-number-key.ts "+15551234567" --network testnet
 */

import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

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

// Instantiate a GraphQL client pointing to the correct network endpoint
const gqlClient = new SuiGraphQLClient({
	url: `https://graphql.${network}.sui.io/graphql`,
});

// GraphQL query to fetch chain identifier details from the KNS ID Map Table.
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
 * Queries the KNS ID Map Table using the provided name and returns an array of string values.
 *
 * @param name - The name (typically an object ID) to look up in the table.
 * @returns A promise that resolves to an array of strings if found.
 * @throws Will throw an error if no matching entry is found.
 */
async function knsIdMapTable(name: string): Promise<string[] | null> {
	const result = await gqlClient.query({
		query: chainIdentifierQuery,
		variables: { id: knsIdMapTableId },
	});
	const nodes = (result.data?.address as any)?.dynamicFields?.nodes;
	const match = nodes?.find((node: any) => node.name.json === name);

	if (!match) {
		throw new Error(`No matching entry found for name: ${name}`);
	}
  return (match.value as { json: string[] })?.json;
}

/**
 * Retrieves a SUI object from the network using its object ID.
 *
 * @param objectId - The unique identifier of the SUI object.
 * @returns A promise that resolves to the SUI object details.
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
 * Main function to perform the SUI KNS lookup.
 *
 * Steps:
 *  1. Reads a phone number from the command line arguments.
 *  2. Makes an API call to retrieve the object ID associated with the phone number.
 *  3. Queries the KNS ID Map Table with the retrieved object ID.
 *  4. For each value found in the table, retrieves the SUI object and logs its public keys.
 *
 * Usage:
 *   ts-node ./sui-lookup.ts <phoneNumber>
 *
 * @example
 *   ts-node ./sui-lookup.ts "+15551234567"
 */
async function main() {
	// Read phone number from command line arguments (filter out --network flag)
	const phoneNumber = args.find((arg, index) => {
		// Skip if it's a flag
		if (arg.startsWith('--')) return false;
		// Skip if it's the value after --network flag
		if (networkIndex !== -1 && index === networkIndex + 1) return false;
		// This is the phone number
		return true;
	});
	if (!phoneNumber) {
		console.error('Please provide a phone number in E.164 format as a command line argument.');
		console.error('Usage: ts-node ./lookup-number-key.ts <phoneNumber> [--network <mainnet|testnet>]');
		process.exit(1);
	}

	try {
		// Perform API call to retrieve the objectId for the provided phone number
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

		// Look up the value in the KNS ID Map Table using the retrieved objectId as the name
		const value = await knsIdMapTable(objectId);

		// For each entry in the returned value, fetch the corresponding SUI object and log its public keys
		for (const v of value!) {
			const suiObject = await getSuiObject(v);
			console.log((suiObject?.data?.content as any)?.fields?.public_keys);
		}
	} catch (error: any) {
		console.error('Error:', error.message);
		if (error.response) {
			console.error('Status:', error.response.status);
			console.error('Response data:', JSON.stringify(error.response.data, null, 2));
		}
	}
}

main();
