#!/usr/bin/env bash
# ==============================================================================
# Enterprise RSA Key Generation Script (OpenSSL 3+ & 1.1 Compatible)
# Generates Cryptographically Secure 2048-bit RSA Keys in PKCS#8 and X.509 formats
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KEY_DIR="$SCRIPT_DIR/generated-keys"

echo "================================================================================"
echo "  RSA Asymmetric Key Generation & Inspection Utility"
echo "================================================================================"

mkdir -p "$KEY_DIR"
cd "$KEY_DIR"

# Step 1: Generate RSA Private Key in PKCS#8 format (Required by Java KeyFactory PKCS8EncodedKeySpec)
echo "[1/4] Generating 2048-bit RSA Private Key in PKCS#8 unencrypted format..."
openssl genpkey -algorithm RSA \
  -pkeyopt rsa_keygen_bits:2048 \
  -out private_key.pem

echo "      -> Generated: $KEY_DIR/private_key.pem"
echo "      -> Header: $(head -n 1 private_key.pem)"

# Step 2: Extract RSA Public Key in X.509 SubjectPublicKeyInfo format
echo "[2/4] Extracting RSA Public Key in X.509 SubjectPublicKeyInfo format..."
openssl pkey -in private_key.pem \
  -pubout \
  -out public_key.pem

echo "      -> Generated: $KEY_DIR/public_key.pem"
echo "      -> Header: $(head -n 1 public_key.pem)"

# Step 3: Inspect ASN.1 DER structure
echo "[3/4] Verifying ASN.1 DER Encoding structure..."
echo "--- ASN.1 Structure of PKCS#8 Private Key (First 10 lines) ---"
openssl asn1parse -in private_key.pem | head -n 10 || true

echo "--- ASN.1 Structure of X.509 Public Key ---"
openssl asn1parse -in public_key.pem || true

# Step 4: Sync keys to Spring Boot Microservices
echo "[4/4] Syncing keys to auth-service and resource-service..."

# Auth service gets both Private Key and Public Key
mkdir -p "$PROJECT_ROOT/auth-service/src/main/resources/keys"
cp "$KEY_DIR/private_key.pem" "$PROJECT_ROOT/auth-service/src/main/resources/keys/private_key.pem"
cp "$KEY_DIR/public_key.pem" "$PROJECT_ROOT/auth-service/src/main/resources/keys/public_key.pem"

# Resource service gets ONLY Public Key (Never Private Key!)
mkdir -p "$PROJECT_ROOT/resource-service/src/main/resources/keys"
cp "$KEY_DIR/public_key.pem" "$PROJECT_ROOT/resource-service/src/main/resources/keys/public_key.pem"
rm -f "$PROJECT_ROOT/resource-service/src/main/resources/keys/private_key.pem"

echo "================================================================================"
echo "  RSA Key Generation Completed Successfully!"
echo "  auth-service:     private_key.pem (SECRET) + public_key.pem"
echo "  resource-service: public_key.pem ONLY (ZERO private key exposure)"
echo "================================================================================"
