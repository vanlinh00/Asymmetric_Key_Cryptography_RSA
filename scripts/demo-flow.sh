#!/usr/bin/env bash
# ==============================================================================
# Complete RSA Cryptography & Microservices End-to-End Automated Demonstration
# Tests all endpoints across auth-service (8081) and resource-service (8082)
# ==============================================================================
set -euo pipefail

AUTH_URL="http://localhost:8081"
RESOURCE_URL="http://localhost:8082"

echo "================================================================================"
echo "  RSA Asymmetric Cryptography Microservices: End-to-End Flow"
echo "================================================================================"

echo ""
echo "--- STEP 1: Verify auth-service JWKS Endpoint (RFC 7517) ---"
echo "GET $AUTH_URL/.well-known/jwks.json"
JWKS_RESPONSE=$(curl -s "$AUTH_URL/.well-known/jwks.json")
echo "JWKS Output:"
echo "$JWKS_RESPONSE" | jq . || echo "$JWKS_RESPONSE"

echo ""
echo "--- STEP 2: Authenticate User & Issue RS256-signed JWT ---"
echo "POST $AUTH_URL/api/v1/auth/login (user: alice)"
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq . || echo "$LOGIN_RESPONSE"

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo "Error: Failed to obtain JWT access token. Ensure auth-service is running on port 8081."
  exit 1
fi

echo ""
echo "Extracted JWT Access Token:"
echo "${JWT_TOKEN:0:50}... (length: ${#JWT_TOKEN})"

echo ""
echo "--- STEP 3: Attempt Unauthorized Access to resource-service (Expect 401) ---"
echo "GET $RESOURCE_URL/api/v1/data/secure-info without Authorization header"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RESOURCE_URL/api/v1/data/secure-info" || true)
echo "HTTP Status Code: $HTTP_CODE (Expected: 401 Unauthorized)"

echo ""
echo "--- STEP 4: Access Protected Endpoint on resource-service with RS256 Bearer JWT ---"
echo "GET $RESOURCE_URL/api/v1/data/secure-info"
echo "Authorization: Bearer <RS256_TOKEN>"
SECURE_DATA_RESPONSE=$(curl -s "$RESOURCE_URL/api/v1/data/secure-info" \
  -H "Authorization: Bearer $JWT_TOKEN")
echo "Secure Data Response:"
echo "$SECURE_DATA_RESPONSE" | jq . || echo "$SECURE_DATA_RESPONSE"

echo ""
echo "--- STEP 5: Demonstrate Client Downstream-to-Upstream Asymmetric Payload Confidentiality ---"
echo "resource-service encrypts data using Public Key -> transmits to auth-service /api/v1/crypto/decrypt"
ROUNDTRIP_RESPONSE=$(curl -s -X POST "$RESOURCE_URL/api/v1/client/demo-roundtrip" \
  -H "Content-Type: application/json" \
  -d '{"plaintext": "Confidential Bank Account Transfer: $50,000 to Routing #021000021"}')
echo "Roundtrip Encryption/Decryption Result:"
echo "$ROUNDTRIP_RESPONSE" | jq . || echo "$ROUNDTRIP_RESPONSE"

echo ""
echo "================================================================================"
echo "  End-to-End Cryptographic Demonstration Finished Successfully!"
echo "================================================================================"
