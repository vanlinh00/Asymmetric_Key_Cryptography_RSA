# Asymmetric Cryptography (RSA) in Spring Boot Microservices
> A developer-friendly, production-grade guide to understanding **RSA**, **RS256 JWTs**, **JWKS**, and **Payload Encryption** using Java 17 and Spring Boot 3.4.

---

## 💡 The 60-Second Mental Model

Imagine a **public mailbox with a slot**:
- **Anyone can drop a letter in** because the slot is open to the public (**Public Key**).
- **Only the postal worker with the physical key can unlock and read the letters** (**Private Key**).

Now imagine a **wax seal with an official signet ring**:
- **Only the King has the signet ring to stamp the seal** (**Private Key signs the token**).
- **Anyone in the kingdom can look at the royal crest and verify it's authentic** (**Public Key verifies the token**).

### Symmetric vs Asymmetric in Plain English

| Feature | Symmetric (HS256) | Asymmetric (RS256) ⭐ |
| :--- | :--- | :--- |
| **How many keys?** | **1 shared secret password** | **2 keys**: Private Key + Public Key |
| **Who can create tokens?** | Anyone who has the password | **Only the Auth Service** (holds Private Key) |
| **Who can verify tokens?** | Anyone who has the password | **Any service** (holds Public Key) |
| **What if a downstream service gets hacked?** | **Disaster**: Attacker steals the password and can fake tokens for the entire system! | **Safe**: Attacker only gets the Public Key. They cannot forge tokens! |
| **Key Rotation** | Painful. Must restart all 20+ microservices at the same exact second. | Seamless. Auth server publishes new public keys via a URL (`jwks.json`). |

---

## 🏛️ The Two Microservices

This project splits responsibilities cleanly between two services:

```
┌─────────────────────────────────────────┐
│        auth-service (Port 8081)         │
│         "The Token Issuer & Key Owner"  │
│                                         │
│ • Holds: private_key.pem (KEEP SECRET!) │
│ • POST /api/v1/auth/login               │
│   Authenticates user & signs RS256 JWT  │
│ • GET /.well-known/jwks.json            │
│   Shares Public Key with the world      │
│ • POST /api/v1/crypto/decrypt           │
│   Decrypts secret payloads from clients │
└───────────────────┬─────────────────────┘
                    │
                    │ 1. Client logs in, gets RS256 Bearer JWT
                    ▼
┌─────────────────────────────────────────┐
│               Client / App              │
└───────────────────┬─────────────────────┘
                    │
                    │ 2. Client sends token: "Authorization: Bearer <TOKEN>"
                    ▼
┌─────────────────────────────────────────┐
│      resource-service (Port 8082)       │
│        "The Downstream Resource Server" │
│                                         │
│ • Holds: public_key.pem ONLY            │
│   (Has ZERO knowledge of Private Key)   │
│ • GET /api/v1/data/secure-info          │
│   Validates token locally using math    │
│   (Does NOT call auth-service!)         │
│ • SecureCryptoClient                    │
│   Encrypts data with Public Key and     │
│   sends it to auth-service to decrypt   │
└─────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
rsa-cryptography-microservices/
├── pom.xml                                  <-- Parent POM (Java 17, Spring Boot 3.4.0)
│
├── crypto-common/                           <-- Shared Library
│   └── src/main/java/com/security/rsa/common/
│       ├── util/PemKeyUtils.java            <-- Reads .pem files into Java RSA Key objects
│       ├── crypto/RsaCryptoService.java     <-- RSA-OAEP encryption & decryption service
│       ├── crypto/AsymmetricKeyGenerator.java<-- Generates fresh 2048-bit RSA keys
│       ├── config/RsaKeyProperties.java     <-- Binds "rsa.*" configs from application.yml
│       └── model/                           <-- DTOs (LoginRequest, TokenResponse, etc.)
│
├── auth-service/ (Port 8081)                <-- Key Owner & Token Issuer
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml              <-- Port 8081, paths to keys
│       │   └── keys/
│       │       ├── private_key.pem          <-- SECRET: Used to sign & decrypt
│       │       └── public_key.pem           <-- PUBLIC: Used to verify
│       └── java/com/security/rsa/auth/
│           ├── controller/AuthController.java  <-- POST /api/v1/auth/login
│           ├── controller/JwksController.java  <-- GET /.well-known/jwks.json
│           ├── controller/CryptoController.java<-- POST /api/v1/crypto/decrypt
│           └── service/JwtTokenService.java    <-- Creates RS256 signed JWTs
│
├── resource-service/ (Port 8082)            <-- Downstream Protected API
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml              <-- Port 8082
│       │   └── keys/
│       │       └── public_key.pem           <-- PUBLIC KEY ONLY! (No private key)
│       └── java/com/security/rsa/resource/
│           ├── config/ResourceSecurityConfig.java   <-- Spring Security 6.4 Resource Server
│           ├── controller/SecureDataController.java <-- Protected GET /api/v1/data/secure-info
│           └── client/SecureCryptoClient.java       <-- Encrypts data using Public Key
│
└── scripts/
    ├── generate-keys.sh                     <-- OpenSSL commands to generate new keys
    ├── run-services.sh                      <-- Builds and runs both apps
    └── demo-flow.sh                         <-- Automated test script using curl
```

---

## 🚀 3-Minute Quickstart

### 1. Build Everything
```bash
mvn clean package -DskipTests
```

### 2. Start Both Services
```bash
./scripts/run-services.sh
```
* `auth-service` starts on **http://localhost:8081**
* `resource-service` starts on **http://localhost:8082**

### 3. Run the Automated Demo
In a second terminal:
```bash
./scripts/demo-flow.sh
```

---

## 🧪 Manual Walkthrough (Step-by-Step with `curl`)

### Step 1: Look at the Public Key on `auth-service`
Open your browser or run:
```bash
curl http://localhost:8081/.well-known/jwks.json
```
**Output (RFC 7517 JSON Web Key Set):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "rsa-auth-key-1",
      "n": "5xxZqXwVWHTj9RUqhZ18...",
      "e": "AQAB"
    }
  ]
}
```
* `n` is the RSA Modulus.
* `e` is the Public Exponent (`AQAB` in Base64 = `65537`).
* Notice that the private key parameters (`d`, `p`, `q`) are **never exposed**.

---

### Step 2: Log in to `auth-service` and Get an RS256 Token
```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```
**Output:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6InJzYS1hdXRoLWtleS0xIiw...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "algorithm": "RS256",
  "key_id": "rsa-auth-key-1",
  "roles": ["ROLE_USER"]
}
```
* `auth-service` signed this token using its private key (`private_key.pem`).
* Save this token into an environment variable:
```bash
TOKEN="<paste_access_token_here>"
```

---

### Step 3: Try Accessing `resource-service` Without a Token
```bash
curl -i http://localhost:8082/api/v1/data/secure-info
```
**Output:**
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="unauthorized"
```
Spring Security 6.4 immediately blocks unauthenticated requests.

---

### Step 4: Access `resource-service` With Your Token
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/v1/data/secure-info
```
**Output:**
```json
{
  "message": "Access granted to confidential resource-service domain! JWT verified statelessly using RSA Public Key.",
  "authenticatedSubject": "alice",
  "issuer": "http://localhost:8081",
  "authorities": ["ROLE_USER"],
  "verificationMethod": "RSA RS256 Verification (Zero remote network roundtrip)"
}
```
**How this works:**
`resource-service` checked the signature using **only its local `public_key.pem`**. It did **NOT** make any network calls to `auth-service`. This means:
1. Verification takes less than `0.2 milliseconds`.
2. Even if `auth-service` is temporarily down or under heavy load, `resource-service` can continue validating users!

---

### Step 5: Encrypt a Secret Payload Downstream → Upstream
Suppose `resource-service` needs to transmit credit card data or customer PII to `auth-service`:
```bash
curl -X POST http://localhost:8082/api/v1/client/demo-roundtrip \
  -H "Content-Type: application/json" \
  -d '{"plaintext": "Confidential Card: 4111-2222-3333-4444"}'
```
**Output:**
```json
{
  "plaintext": "Confidential Card: 4111-2222-3333-4444",
  "ciphertext": "a9Z81kq...[Base64 encrypted with Public Key]...",
  "authServiceDecryptionResult": {
    "decryptedContent": "Confidential Card: 4111-2222-3333-4444",
    "status": "SUCCESS",
    "decryptedBy": "auth-service (JCA Private Key Decryptor)",
    "decryptionAlgorithm": "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"
  }
}
```
* `resource-service` encrypted the card number with `public_key.pem`.
* Anyone sniffing internal network traffic only sees gibberish.
* Only `auth-service` (possessing `private_key.pem`) could decrypt it!

---

## 🔑 Generating New RSA Keys with OpenSSL

If you want to create your own fresh keys, run:
```bash
./scripts/generate-keys.sh
```

Behind the scenes, it runs two standard OpenSSL commands:
```bash
# 1. Generate 2048-bit Private Key in PKCS#8 format (for Java KeyFactory)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem

# 2. Extract Public Key in X.509 format
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

> **Why PKCS#8?**
> Java's standard `PKCS8EncodedKeySpec` expects `-----BEGIN PRIVATE KEY-----` (PKCS#8).
> Older tools generated `-----BEGIN RSA PRIVATE KEY-----` (PKCS#1), which requires extra parsing in Java. PKCS#8 is the modern, universal standard.

---

## 🛡️ Key Code Snippets Explained

### 1. How Java 17 Loads a PEM Public Key (`PemKeyUtils.java`)
```java
// 1. Strip the header, footer, and spaces
String cleanPem = pemContent
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replaceAll("\\s+", "");

// 2. Base64 decode into raw DER bytes
byte[] keyBytes = Base64.getDecoder().decode(cleanPem);

// 3. Hand bytes to Java KeyFactory to build the RSAPublicKey object
X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
KeyFactory keyFactory = KeyFactory.getInstance("RSA");
RSAPublicKey publicKey = (RSAPublicKey) keyFactory.generatePublic(spec);
```

### 2. How `resource-service` Verifies Tokens with Spring Security 6.4
```java
@Bean
public JwtDecoder jwtDecoder(RSAPublicKey publicKey) {
    // NimbusJwtDecoder mathematically validates the token using the public key
    return NimbusJwtDecoder.withPublicKey(publicKey).build();
}
```

### 3. How `auth-service` Decrypts Sensitive Data with RSA-OAEP
```java
// OAEP with SHA-256 protects against padding oracle attacks
Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParameterSpec);
byte[] plainBytes = cipher.doFinal(Base64.getDecoder().decode(base64Ciphertext));
String plainText = new String(plainBytes, StandardCharsets.UTF_8);
```

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Why not use HMAC (HS256)?
**A:** In HS256, verification requires the exact same secret used to create tokens. If you have 20 microservices, all 20 must know that secret. If even 1 low-priority service is compromised, the attacker can create fake `ROLE_ADMIN` tokens for the whole system. With RS256, only `auth-service` can create tokens.

### Q: Does `resource-service` call `auth-service` for every request?
**A:** **No!** That is the greatest strength of asymmetric JWTs. The public key contains the mathematical formula to check if the signature was stamped by the private key. No network calls are made.

### Q: What is JWKS (`.well-known/jwks.json`)?
**A:** It is a standardized JSON format (RFC 7517) for sharing public keys. It allows downstream services to automatically download new public keys whenever keys are rotated, without needing to restart services or update config files.

---

## 💻 Tech Stack Summary
- **Language**: Java 17 (LTS)
- **Framework**: Spring Boot 3.4.0
- **Security**: Spring Security 6.4 (`spring-boot-starter-oauth2-resource-server`)
- **JWT & Cryptography**: Nimbus JOSE + JWT (`com.nimbusds:nimbus-jose-jwt`) & Java Cryptography Architecture (JCA)
- **Build Tool**: Apache Maven (multi-module)
