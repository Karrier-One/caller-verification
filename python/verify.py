import sys
import jwt
import json

# Command-line arguments
if len(sys.argv) < 3:
    print("Usage: python verify.py <jwtFile> <publicKeyFile>")
    sys.exit(1)

jwt_file = sys.argv[1]
public_key_file = sys.argv[2]

# Read the JWT
try:
    with open(jwt_file, 'r') as f:
        token = f.read().strip()
except FileNotFoundError:
    print(f"Error: JWT file '{jwt_file}' not found.")
    sys.exit(1)

# Read the public key
try:
    with open(public_key_file, 'r') as f:
        public_key = f.read()
except FileNotFoundError:
    print(f"Error: Public key file '{public_key_file}' not found.")
    sys.exit(1)

# Decode without verification
try:
    decoded_unverified = jwt.decode(token, options={"verify_signature": False}, algorithms=["ES256"])
    print("\n", json.dumps(decoded_unverified, indent=4))
except Exception as e:
    print(f"Error decoding JWT without verification: {e}")

# Decode and verify the JWT
try:
    decoded = jwt.decode(token, public_key, algorithms=["ES256"], options={"verify_exp": False})
    print("Verification Succeeded")
except jwt.ExpiredSignatureError:
    print("Error: JWT signature has expired.")
except jwt.InvalidSignatureError:
    print("Error: JWT signature is invalid.")
except jwt.DecodeError:
    print("Error: Failed to decode JWT.")
except Exception as e:
    print(f"Error: {e}")
