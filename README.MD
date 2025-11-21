# Call Verification Example Utilities

This project provides utilities to generate and verify JSON Web Tokens (JWTs) for a blockchain-enabled call verification flow similar to the STIR/SHAKEN initiative. It includes tools for creating ES256 key pairs, signing JWTs, and verifying them using the corresponding public keys. **Note:** ES256 is the JWT algorithm identifier for ECDSA using the P-256 curve with SHA-256.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Scripts Overview](#scripts-overview)
  - [1. Generate Keys](#1-generate-keys)
  - [2. Sign a JWT](#2-sign-a-jwt)
  - [3. Verify a JWT](#3-verify-a-jwt)
- [Workflow Example](#workflow-example)
- [Additional JWT Verification Examples](#additional-jwt-verification-examples)
  - [Python Verification](#python-verification)
  - [.NET Verification](#net-verification)
- [SUI Blockchain Integration](#sui-blockchain-integration)
  - [Keystore Registration](#keystore-registration)
  - [Lookup KNS Object ID from Phone Number](#lookup-kns-object-id-from-phone-number)
  - [Mapping a KNS ID to a Certificate Registry](#mapping-a-kns-id-to-a-certificate-registry)
  - [Dumping KNS ID to a Certificate Registry Table](#dumping-kns-id-to-a-certificate-registry-table)
  - [Lookup Public Key for a Phone Number](#lookup-the-public-key-for-a-phone-number)
  - [Full JWT Verification Flow](#full-jwt-verification-flow)
  
---

## Prerequisites
- Node.js 22+ installed.
- ts-node installed globally or as a development dependency.
    ```bash
    npm install -g ts-node
    ```
    Required Node.js packages:
    ```bash
    npm install
    ```

## Scripts Overview
generate-key.ts: Generates a new ES256 key pair.

authorize.ts: Signs a JWT using a private key and saves it to a file.

verify.ts: Verifies a signed JWT using the corresponding public key.
Commands
## 1. Generate Keys
Generate a new ES256 key pair:

```bash
ts-node generate-key.ts [--private <privateKeyFilename>] [--public <publicKeyFilename>]
```
Output:
- A private key file: es256-private-key-{timestamp}.pem
- A public key file: es256-public-key-{timestamp}.pem

## 2. Sign a JWT
Sign a JWT using a private key and save it to a file:

```bash
ts-node ./authorize.ts <e164 Orig TN> <e164 DestTN> <Call Orig ID> <privateKeyFile> <outputJwtFile>
```
Arguments:
- `<e164 Orig TN>`: Originating e.164 phone number. The number to be verified.
- `<e164 DestTN>`: Destination e.164 phone number.
- `<Call Orig ID>`: Call Identifier (can be anything).
- `<privateKeyFile>`: Path to the private key file for signing the JWT.
- `<outputJwtFile>`: Path to save the signed JWT.

Example:

```bash
ts-node ./authorize.ts "+14317001005" "+15552223333" "abcdefg" ./es256-private-key.pem ./es256-signed.jwt
```
Output:

- A signed JWT file: es256-signed.jwt

## 3. Verify a JWT
Verify a JWT using a public key:

```bash
ts-node ./verify.ts <jwtFile> <publicKeyFile>
```
Arguments:
- `<jwtFile>`: Path to the signed JWT file. Defaults to es256-signed.jwt.
- `<publicKeyFile>`: Path to the public key file. Defaults to es256-public-key.pem.

```bash
ts-node ./verify.ts es256-signed.jwt es256-public-key.pem
```
Output:

- Decoded JWT contents (header, payload, and signature).
- Verification result or failure message.
## Workflow Example
Generate a Key Pair:

```bash
ts-node ./generate-key.ts
ts-node ./authorize.ts "+14317001068" es256-private-key.pem es256-signed.jwt
ts-node ./verify.ts es256-signed.jwt es256-public-key.pem
```
## Additional JWT Verification Examples
## Python Verification
### Setup Environment
```bash
cd python
python3 -m venv venv
source venv/bin/activate
pip install pyjwt cryptography
```
### Verify
```bash
cd python
python verify.py ../es256-signed.jwt ../es256-public-key.pem
```

## .NET Verification
### Setup Environment
```bash
sudo snap install dotnet-sdk
```
### Verify
```bash
cd dotnet
dotnet run ../es256-signed.jwt ../es256-public-key.pem
```

# SUI Blockchain Integration

## Keystore Registration
to create an instance of the keystore (you would do this per telecom).  Need to update the .env file with the contract address after publishing
```bash
ts-node ./register-keystore.ts <publicKeyFile> <name> <creator> <imageUrl> <rawPrivateKey> 
```
Example:
```bash
ts-node ./register-keystore.ts ./public_key.pem "Keystore v1" "Karrier One" "https://placehold.co/600x600.png?text=Keystore" "BASE64+SUI+PRIVATE+KEY"
```


# Lookup KNS Object ID from Phone Number
### Development (testnet)
curl --location 'https://kns-api.karrier.dev/kns/object-id-lookup' \
--header 'x-api-key: testkey' \
--header 'Content-Type: application/json' \
--data '{
  "phoneNumber": "+14317001068"
}'

### Production (mainnet)
curl --location 'https://kns-api.karrier.one/kns/object-id-lookup' \
--header 'x-api-key: testkey' \
--header 'Content-Type: application/json' \
--data '{
  "phoneNumber": "+13057650204"
}'

# Mapping a KNS ID to a certificate registry
## Add an entry
```bash
ts-node ./map-kns-registry-add.ts <knsObjectId> <keyStoreObjectId> <rawPrivateKey>
```
Example:
```bash
ts-node ./map-kns-registry-add.ts 0x15169590b423866a9d4ff0ccc605a1408dcb11ecbf651981b8c2883fade76317 0x91f34cd71d99801292a16221a5498e3115a90d8cf1e3f2b9f9681564284b96e9 "BASE64+SUI+PRIVATE+KEY"
```

## Update an entry
```bash
ts-node ./map-kns-registry-update.ts <knsObjectId> <keyStoreObjectId> <rawPrivateKey>
```
Example:
```bash
ts-node ./map-kns-registry-update.ts 0x15169590b423866a9d4ff0ccc605a1408dcb11ecbf651981b8c2883fade76317 0x91f34cd71d99801292a16221a5498e3115a90d8cf1e3f2b9f9681564284b96e9 "BASE64+SUI+PRIVATE+KEY"
```

## Remove an entry
```bash
ts-node ./map-kns-registry-remove.ts <knsObjectId> <rawPrivateKey>
```
Example:
```bash
ts-node ./map-kns-registry-remove.ts 0x15169590b423866a9d4ff0ccc605a1408dcb11ecbf651981b8c2883fade76317 "BASE64+SUI+PRIVATE+KEY"
```

# Dumping KNS ID to a certificate registry table
```bash
ts-node ./map-kns-registry-dump.ts
```

# Lookup the public key for a phone number
1. The KNS Rest API (authenticated) is use to get the KNS NFT ID for the phone number.  
2. The KNS NFT ID is used to get the Certificate Store ID(s) (via GraphQL) from the Sui blockchain.
3. The Sui Json RPC API is used to get the Certificate Store(s) (from the Sui) blockchain and the public key(s) are retrieved
4. Public key is matched and verified.

Example:
```bash
ts-node ./lookup-number-key.ts "+14317001078"
```

```curl
curl --location 'https://kns-api.karrier.dev/kns/object-id-lookup' \
--header 'x-api-key: testkey' \
--header 'Content-Type: application/json' \
--data '{
  "phoneNumber": "+14317001068"
}'

{
    "objectId": "0xe8f55da072575d83ea17c6ee357edb344fa243aae071d552bdc4a7d69f740dec",
    "registries": []
}
```

# Full JWT verification flow
### Originating Server
```bash
ts-node ./authorize.ts "+14317001075" "+14165551234" "call1" es256-private-key.pem es256-signed.jwt
```
### Terminating Server
```bash
ts-node ./verify-full-flow.ts es256-signed.jwt
```

```curl
curl --location 'https://kns-api.karrier.dev/kns/call-signature-verification' \
--header 'x-api-key: testkey' \
--header 'Content-Type: application/json' \
--data '{
  "jwt": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS1pZC0xMjM0In0.eyJvcmlnIjp7InRuIjoiKzE0MzE3MDAxMDc4In0sImRlc3QiOnsidG4iOiIrMTQ0NDU1NTY3ODkifSwiaWF0IjoxNzM3ODczNzk3LCJhdHQiOiJBIiwib3JpZ2lkIjoiYWJjZGVmMTIzNDU2In0.ENtZGi-PUDicDe7AxoHRhEQvrLWt7V_6RkAATR7gDYhIGxBJynUBddPOgc0qgkkX85nZBafeatAvE2zL2ZzK1Q",
  "origTN":"+14317001078",
  "destTN":"+14445556789"
}'
{
    "success": true
}
```