#!/usr/bin/env ts-node
/**
 * KNS ID Map Table Lookup Script
 *
 * This script queries the KNS ID Map Table via a GraphQL endpoint on the Sui network.
 * It retrieves the dynamic fields of the owner of a Sui object identified by the KNS ID Map Table ID.
 *
 * Environment Variables:
 *   - KNS_ID_MAP_TABLE_ID: The Sui object ID for the KNS ID Map Table. (Required)
 *   - SUI_NETWORK: The Sui network to target ("testnet" or "mainnet"). This is used to construct the GraphQL endpoint URL.
 *
 * Usage:
 *   ts-node ./map-kns-registry-dump.ts
 *
 * The script will output the nodes from the dynamic fields of the KNS ID Map Table owner.
 *
 * Note: Ensure your .env file is properly configured with the required environment variables.
 */

import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

// Retrieve the KNS ID Map Table ID from the environment variables (required)
const knsIdMapTableId = process.env.KNS_ID_MAP_TABLE_ID!;

// Instantiate a GraphQL client targeting the correct Sui network endpoint
const gqlClient = new SuiGraphQLClient({
	url: `https://sui-${process.env.SUI_NETWORK! as "testnet" | "mainnet"}.mystenlabs.com/graphql`,
});

// GraphQL query to fetch dynamic fields for the owner of the KNS ID Map Table
const chainIdentifierQuery = graphql(`
query ($id: SuiAddress!) {
  owner(address: $id) {
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
 * It retrieves the dynamic fields of the object owner and logs the nodes as a formatted JSON string.
 *
 * @returns A promise that resolves to the array of dynamic field nodes, or undefined if no data is found.
 */
async function knsIdMapTable() {
	const result = await gqlClient.query({
		query: chainIdentifierQuery,
		variables: { id: knsIdMapTableId },
	});
  
  // Log the resulting nodes in a readable JSON format
  console.log(JSON.stringify(result.data?.owner?.dynamicFields.nodes, null, 2));
	return result.data?.owner?.dynamicFields.nodes;
}

// Execute the lookup
knsIdMapTable();
