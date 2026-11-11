# Asymmetric Key Cryptography (RSA) in Java 17 & Spring Boot 3.4 Microservices

A production-grade multi-module Maven microservices reference architecture implementing **Asymmetric Key Cryptography (RSA)**, **RS256 JWT Token Issuance**, **RFC 7517 JWKS Discovery**, and **Java Cryptography Architecture (JCA)** payload encryption with Spring Boot 3.4.0 and Spring Security 6.4.

---

## 🏛️ System Architecture

```
                          ┌────────────────────────────────────────────────────────┐
                          │                AUTH-SERVICE (Port 8081)                │
                          │   Token Issuer & Cryptographic Key Owner               │
                          │   Holds: private_key.pem (SECRET) & public_key.pem     │
                          └──────┬──────────────────────────────────▲──────────────┘
                                 │                                  │
                   1. POST /login│                                  │3. POST /crypto/decrypt
                      Issues     │                                  │   Decrypts payload
                      RS256 JWT  │                                  │   using Private Key
                                 ▼                                  │
                          ┌─────────────┐                           │
                          │   CLIENT    │                           │
                          └──────┬──────┘                           │
                                 │                                  │
                   2. GET /secure-info                              │
                      Bearer <RS256_JWT>                            │
                                 ▼                                  │
                          ┌─────────────────────────────────────────┴──────────────┐
                          │               RESOURCE-SERVICE (Port 8082)             │
                          │   Downstream OAuth2 Resource Server                    │
                          │   Holds: public_key.pem ONLY (ZERO Private Key)        │
                          │   Validates JWT statelessly using local RSA Public Key │
                          │   Encrypts secrets with Public Key before forwarding   │
                          └────────────────────────────────────────────────────────┘
```

---

## 🔑 Asymmetric Key Cryptography (RSA) Foundations

### 1. Mathematical Underpinnings
RSA relies on the practical difficulty of the prime factorization problem:
- Choose two large distinct primes $p$ and $q$.
- Compute the modulus $n = p \times q$. The bit-length of $n$ defines the key strength (e.g. 2048 bits).
- Calculate Euler's totient: $\phi(n) = (p - 1)(q - 1)$.
- Choose public exponent $e$ such that $1 < e < \phi(n)$ and $\gcd(e, \phi(n)) = 1$ (Standard: $65537 = 2^{16} + 1$).
- Compute private exponent $d \equiv e^{-1} \pmod{\phi(n)}$.
- **Public Key**: $(e, n)$
- **Private Key**: $(d, n)$ (along with CRT components $p, q, dp, dq, q_{inv}$ for fast computation).

### 2. Dual Capabilities of RSA:
1. **Digital Signatures (Authentication & Non-repudiation)**:
   - Issuer hashes the message ($H = \text{SHA-256}(M)$) and encrypts $H$ with the **Private Key**: $S = H^d \pmod n$.
   - Any verifier with the **Public Key** computes $H' = S^e \pmod n$ and verifies $H' == H$.
   - Demonstrated in this project via **RS256 JWTs**.
2. **Asymmetric Encryption (Confidentiality)**:
   - Sender encrypts data using the recipient's **Public Key**: $C = M^e \pmod n$.
   - Only the recipient with the matching **Private Key** can decrypt: $M = C^d \pmod n$.
   - Demonstrated in this project via **JCA RSA-OAEP SHA-256**.

### 3. Why RSA-OAEP instead of PKCS#1 v1.5?
- **Bleichenbacher's Attack (Million Message Attack)**: PKCS#1 v1.5 padding errors act as an oracle allowing attackers to decrypt ciphertexts without the private key.
- **OAEP (Optimal Asymmetric Encryption Padding)**: Combines asymmetric encryption with an all-or-nothing transform using Feistel networks and cryptographic hash functions (SHA-256 with MGF1). It is provably IND-CCA2 secure.

### 4. Why Asymmetric (RS256) is Safer for Microservices than Symmetric (HS256)

> **Core Architectural Axiom**:
> *"Asymmetric keys (like RS256): It uses a pair of keys. The Auth server uses a Private Key to create the token, while other servers use a Public Key to verify it. This is safer for microservices."*

In modern distributed microservices, **asymmetric cryptography decouples the authority to mint credentials from the capability to verify them**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             SYMMETRIC (HS256) - HIGH RISK                              │
│                                                                                        │
│   AUTH SERVER               BILLING SERVICE               REPORTING SERVICE            │
│   ┌─────────────┐           ┌─────────────┐               ┌─────────────┐              │
│   │Shared Secret│──────────▶│Shared Secret│──────────────▶│Shared Secret│              │
│   └─────────────┘           └─────────────┘               └──────┬──────┘              │
│                                                                  │ BREACHED!           │
│                                                                  ▼                     │
│                                                     [ Attacker steals Secret ]         │
│                                                                  │                     │
│                                            FORGES ADMIN TOKEN FOR ALL SERVICES!        │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           ASYMMETRIC (RS256) - ZERO TRUST                              │
│                                                                                        │
│   AUTH SERVER (8081)        RESOURCE SERVER (8082)        REPORTING SERVICE            │
│   ┌─────────────┐           ┌─────────────┐               ┌─────────────┐              │
│   │ PRIVATE KEY │           │ Public Key  │               │ Public Key  │              │
│   │  (Isolated) │           │ (Verify Only│               │ (Verify Only│              │
│   └─────────────┘           └─────────────┘               └──────┬──────┘              │
│                                                                  │ BREACHED!           │
│                                                                  ▼                     │
│                                                     [ Attacker gets Public Key ]       │
│                                                                  │                     │
│                                             CANNOT FORGE TOKENS (Needs Priv Key)       │
│                                             SYSTEM INTEGRITY REMAINS INTACT!           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Security & Architectural Breakdown:

#### A. Decoupled Authority & Blast Radius Containment
- **With Symmetric HS256**: The cryptographic primitive (HMAC-SHA256) uses the exact same secret for signing ($H = \text{HMAC}(K, M)$) and verifying ($H' == H$). Consequently, **every downstream microservice that needs to verify tokens must possess the signing secret**. If a low-security service (e.g. an internal reporting tool or third-party logger) is breached, the attacker dumps the secret and instantly gains the ability to mint valid counterfeit `ROLE_ADMIN` tokens for **any service in the ecosystem**.
- **With Asymmetric RS256**: The private key ($d$) remains strictly isolated in `auth-service`. Downstream services hold only the public key ($e, n$). If a downstream microservice is breached, the attacker only acquires public keys. Because generating an RSA signature requires computing $S = H^d \pmod n$, **it is mathematically impossible to forge tokens without $d$**. The breach is strictly contained.

#### B. Eradication of "Secret Sprawl"
- In an architecture with 30 microservices, HS256 forces you to distribute and synchronize 30 identical copies of a high-value secret across Kubernetes Secrets, CI/CD pipelines, Docker environments, and developer workstations.
- With RS256, only 1 service (`auth-service`) holds a secret. Public keys are non-sensitive and can be freely published via DNS, RFC 7517 JWKS endpoints, or checked into version control.

#### C. Zero-Downtime Key Rotation via RFC 7517 JWKS
- **HS256 Secret Rotation**: Requires synchronized cluster-wide deployment. If one service updates before another, valid tokens are rejected.
- **RS256 Key Rotation**: `auth-service` generates a new key pair (`kid: "rsa-key-2"`), publishes it at `GET /.well-known/jwks.json`, and signs new tokens with it. Downstream services dynamically pull the new key based on the JWT's `kid` header while still verifying in-flight tokens signed with `rsa-key-1`. Zero downtime, zero synchronized redeployments.

#### D. Stateless Offline Verification Performance
- Downstream services verify tokens purely mathematically using their local `RSAPublicKey` bean in $\sim 0.1\text{ ms}$, without making synchronous network calls back to `auth-service`. This eliminates single-points-of-failure (SPOF) and network latency bottlenecks.

| Architectural Dimension | Symmetric (HS256) | Asymmetric (RS256) |
|---|---|---|
| **Secret Distribution** | Shared Secret ($1:N$) - Every downstream service holds the secret | Private Key ($1$), Public Key ($N$) |
| **Downstream Compromise Blast Radius** | **Catastrophic (Total)** - Attacker can forge `ROLE_ADMIN` tokens across all services | **Zero Escalation** - Attacker only gets Public Key; token minting is mathematically impossible |
| **Key Rotation Complexity** | Synchronous, high-risk, requires simultaneous deployment | Transparent via RFC 7517 JWKS (`kid`) without redeploying microservices |
| **Third-Party / Client Verification** | Impossible without exposing signing ability | Native & Safe - Anyone can verify without being able to forge |
| **Spring Security 6.4 Support** | Manual secret configuration | Native `spring-boot-starter-oauth2-resource-server` (`NimbusJwtDecoder.withPublicKey`) |

---

## 📦 Multi-Module Project Structure

| Module | Port | Key Roles & Cryptographic Material |
|---|---|---|
| `crypto-common` | N/A | Java 17 `KeyFactory` utilities (`PemKeyUtils`), JCA `RsaCryptoService`, `@ConfigurationProperties(prefix = "rsa")` bindings, DTOs |
| `auth-service` | `8081` | Holds `private_key.pem` & `public_key.pem`. Signs RS256 JWTs (`/api/v1/auth/login`), serves JWKS (`/.well-known/jwks.json`), decrypts downstream payloads (`/api/v1/crypto/decrypt`) |
| `resource-service` | `8082` | Holds `public_key.pem` ONLY. Spring Security 6.4 Resource Server (`/api/v1/data/secure-info`). Encrypts payloads using `SecureCryptoClient` |

---

## 🛠️ Key Generation (OpenSSL 3+ / PKCS#8)

Java's `KeyFactory.getInstance("RSA")` expects private keys in **PKCS#8** format (`PKCS8EncodedKeySpec`) and public keys in **X.509 SubjectPublicKeyInfo** format (`X509EncodedKeySpec`).

```bash
# Generate 2048-bit RSA Private Key in PKCS#8 format
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem

# Extract RSA Public Key in X.509 SubjectPublicKeyInfo format
openssl pkey -in private_key.pem -pubout -out public_key.pem

# Inspect ASN.1 DER breakdown
openssl asn1parse -in private_key.pem
openssl asn1parse -in public_key.pem
```

Or execute the provided automated script:
```bash
./scripts/generate-keys.sh
```

---

## 🚀 Running the Microservices

### Prerequisites
- JDK 17+
- Apache Maven 3.8+

### Build and Launch
```bash
# Compile and package all modules
mvn clean package -DskipTests

# Run services
./scripts/run-services.sh
```

Or start each service independently in separate terminals:
```bash
# Terminal 1: Auth Service (Port 8081)
java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar

# Terminal 2: Resource Service (Port 8082)
java -jar resource-service/target/resource-service-1.0.0-SNAPSHOT.jar
```

---

## 🧪 Testing the Cryptographic Lifecycle

Execute the automated test script:
```bash
./scripts/demo-flow.sh
```

### Manual cURL Walkthrough:

#### 1. Fetch the JSON Web Key Set (JWKS) from `auth-service`
```bash
curl -s http://localhost:8081/.well-known/jwks.json
```
*Notice: Modulus `n` and Exponent `e` are served publicly; the private key `d` is NEVER exposed.*

#### 2. Authenticate and Obtain RS256-Signed JWT
```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | jq -r .access_token)
```

#### 3. Attempt Unauthenticated Access to `resource-service`
```bash
curl -i http://localhost:8082/api/v1/data/secure-info
# Returns HTTP 401 Unauthorized
```

#### 4. Access Protected Endpoint with RS256 Bearer Token
```bash
curl -s http://localhost:8082/api/v1/data/secure-info \
  -H "Authorization: Bearer $TOKEN" | jq .
```
*Notice: `resource-service` verified the token signature using ONLY its local `public_key.pem` without making any network call back to `auth-service`.*

#### 5. Transmit Encrypted Payload Downstream to Upstream
```bash
curl -s -X POST http://localhost:8082/api/v1/client/demo-roundtrip \
  -H "Content-Type: application/json" \
  -d '{"plaintext": "Highly confidential business secret"}' | jq .
```

---

## 🛡️ Spring Security 6.4 Key Patterns

### 1. Spring Boot 3.4 `@ConfigurationProperties` Binding
```java
@ConfigurationProperties(prefix = "rsa")
public class RsaKeyProperties {
    private String privateKeyLocation;
    private String publicKeyLocation;
    private String keyId = "rsa-auth-key-1";
    private String issuer = "http://localhost:8081";
    // Getters and Setters
}
```

### 2. Stateless Offline JWT Verification (`resource-service`)
```java
@Bean
public JwtDecoder jwtDecoder(RSAPublicKey publicKey) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        new JwtTimestampValidator(Duration.ofSeconds(30)),
        new JwtClaimValidator<String>("iss", iss -> "http://localhost:8081".equals(iss))
    ));
    return decoder;
}
```

### 3. JCA RSA-OAEP Encryption & Decryption
```java
Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParameterSpec);
byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
```
