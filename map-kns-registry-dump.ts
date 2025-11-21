#!/usr/bin/env ts-node
/**
 * KNS ID Map Table Lookup Script
 *
 * This script queries the KNS ID Map Table via a GraphQL endpoint on the Sui network.
 * It retrieves the dynamic fields of the owner of a Sui object identified by the KNS ID Map Table ID.
 *
 * Environment Variables:
 *   - KNS_ID_MAP_TABLE_ID: The Sui object ID for the KNS ID Map Table. (Required)
 *   - SUI_NETWORK: The Sui network to target ("testnet" or "mainnet"). Optional, defaults to mainnet.
 *
 * Usage:
 *   ts-node ./map-kns-registry-dump.ts [--network <mainnet|testnet>]
 *
 * Options:
 *   --network <mainnet|testnet>  Override network selection (priority: CLI arg > .env > mainnet)
 *
 * The script will output the nodes from the dynamic fields of the KNS ID Map Table owner.
 */

import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

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

// Retrieve the KNS ID Map Table ID from the environment variables (network-specific)
const knsIdMapTableId = getEnvVar('KNS_ID_MAP_TABLE_ID');

// Instantiate a GraphQL client targeting the correct Sui network endpoint
const gqlClient = new SuiGraphQLClient({
	url: `https://graphql.${network}.sui.io/graphql`,
});

// GraphQL query to fetch dynamic fields for the address of the KNS ID Map Table
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
 * Queries the KNS ID Map Table and logs the dynamic field nodes.
 *
 * This function sends a GraphQL query to the Sui network using the provided KNS ID Map Table ID.
 * It retrieves the dynamic fields of the object address and logs the nodes as a formatted JSON string.
 *
 * @returns A promise that resolves to the array of dynamic field nodes, or undefined if no data is found.
 */
async function knsIdMapTable() {
	const result = await gqlClient.query({
		query: chainIdentifierQuery,
		variables: { id: knsIdMapTableId },
	});

  // Log the resulting nodes in a readable JSON format
  console.log(JSON.stringify(result.data?.address?.dynamicFields?.nodes, null, 2));
	return result.data?.address?.dynamicFields?.nodes;
}

// Execute the lookup
knsIdMapTable();
