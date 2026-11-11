/**
 * Project files registry for the Interactive Codebase Explorer and ZIP Exporter.
 */

export interface ProjectFile {
  path: string;
  name: string;
  module: 'root' | 'crypto-common' | 'auth-service' | 'resource-service' | 'scripts';
  type: 'java' | 'xml' | 'yml' | 'sh' | 'pem' | 'md' | 'dockerfile';
  description: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: '/pom.xml',
    name: 'pom.xml',
    module: 'root',
    type: 'xml',
    description: 'Maven Multi-Module Parent POM declaring Spring Boot 3.4.0, Java 17, and dependencies'
  },
  {
    path: '/docker-compose.yml',
    name: 'docker-compose.yml',
    module: 'root',
    type: 'yml',
    description: 'Docker Compose orchestration for auth-service (8081) and resource-service (8082)'
  },
  {
    path: '/README.md',
    name: 'README.md',
    module: 'root',
    type: 'md',
    description: 'Principal Engineer Cryptographic Architecture & Operations Manual'
  },
  // crypto-common
  {
    path: '/crypto-common/pom.xml',
    name: 'pom.xml',
    module: 'crypto-common',
    type: 'xml',
    description: 'Maven POM for crypto-common shared module'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/util/PemKeyUtils.java',
    name: 'PemKeyUtils.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Java 17 KeyFactory PKCS#8 & X.509 PEM parser and RFC 7517 JWK generator'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/crypto/RsaCryptoService.java',
    name: 'RsaCryptoService.java',
    module: 'crypto-common',
    type: 'java',
    description: 'JCA Cipher service with RSA-OAEP SHA-256 padding for asymmetric encryption/decryption'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/crypto/AsymmetricKeyGenerator.java',
    name: 'AsymmetricKeyGenerator.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Programmatic RSA 2048/4096-bit KeyPairGenerator with SecureRandom'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/config/RsaKeyProperties.java',
    name: 'RsaKeyProperties.java',
    module: 'crypto-common',
    type: 'java',
    description: '@ConfigurationProperties(prefix = "rsa") binding bean'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/model/LoginRequest.java',
    name: 'LoginRequest.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Record DTO for user login credentials'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/model/TokenResponse.java',
    name: 'TokenResponse.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Record DTO for issued JWT and cryptographic metadata'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/model/EncryptedPayloadRequest.java',
    name: 'EncryptedPayloadRequest.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Record DTO for downstream encrypted ciphertext'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/model/DecryptedPayloadResponse.java',
    name: 'DecryptedPayloadResponse.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Record DTO for upstream JCA decrypted content'
  },
  {
    path: '/crypto-common/src/main/java/com/security/rsa/common/model/SecureDataResponse.java',
    name: 'SecureDataResponse.java',
    module: 'crypto-common',
    type: 'java',
    description: 'Record DTO for protected resource server payload with JWT claims'
  },
  // auth-service
  {
    path: '/auth-service/pom.xml',
    name: 'pom.xml',
    module: 'auth-service',
    type: 'xml',
    description: 'Maven POM for auth-service (Spring Boot Web, Security, Nimbus JOSE)'
  },
  {
    path: '/auth-service/src/main/resources/application.yml',
    name: 'application.yml',
    module: 'auth-service',
    type: 'yml',
    description: 'Configuration for auth-service (Port 8081, RSA Private Key binding)'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/AuthServiceApplication.java',
    name: 'AuthServiceApplication.java',
    module: 'auth-service',
    type: 'java',
    description: 'Main Spring Boot 3.4.0 entry point'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/config/RsaKeyConfiguration.java',
    name: 'RsaKeyConfiguration.java',
    module: 'auth-service',
    type: 'java',
    description: 'Spring configuration creating RSAPrivateKey, RSAPublicKey, and JWKSet beans'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/config/AuthSecurityConfig.java',
    name: 'AuthSecurityConfig.java',
    module: 'auth-service',
    type: 'java',
    description: 'Spring Security 6.4 SecurityFilterChain for auth-service'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/service/JwtTokenService.java',
    name: 'JwtTokenService.java',
    module: 'auth-service',
    type: 'java',
    description: 'Token signing service using Nimbus RSASSASigner and RSAPrivateKey'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/service/DecryptionService.java',
    name: 'DecryptionService.java',
    module: 'auth-service',
    type: 'java',
    description: 'Asymmetric decryption service utilizing private key JCA cipher'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/controller/AuthController.java',
    name: 'AuthController.java',
    module: 'auth-service',
    type: 'java',
    description: 'POST /api/v1/auth/login endpoint issuing RS256 JWTs'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/controller/JwksController.java',
    name: 'JwksController.java',
    module: 'auth-service',
    type: 'java',
    description: 'GET /.well-known/jwks.json endpoint serving RFC 7517 Public Keys'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/controller/CryptoController.java',
    name: 'CryptoController.java',
    module: 'auth-service',
    type: 'java',
    description: 'POST /api/v1/crypto/decrypt endpoint for downstream payloads'
  },
  {
    path: '/auth-service/src/main/java/com/security/rsa/auth/exception/GlobalExceptionHandler.java',
    name: 'GlobalExceptionHandler.java',
    module: 'auth-service',
    type: 'java',
    description: '@RestControllerAdvice for standardized RFC 7807 error responses'
  },
  {
    path: '/auth-service/src/main/resources/keys/private_key.pem',
    name: 'private_key.pem',
    module: 'auth-service',
    type: 'pem',
    description: '2048-bit RSA Private Key in PKCS#8 format (SECRET)'
  },
  {
    path: '/auth-service/src/main/resources/keys/public_key.pem',
    name: 'public_key.pem',
    module: 'auth-service',
    type: 'pem',
    description: '2048-bit RSA Public Key in X.509 SubjectPublicKeyInfo format'
  },
  // resource-service
  {
    path: '/resource-service/pom.xml',
    name: 'pom.xml',
    module: 'resource-service',
    type: 'xml',
    description: 'Maven POM for resource-service (Spring OAuth2 Resource Server)'
  },
  {
    path: '/resource-service/src/main/resources/application.yml',
    name: 'application.yml',
    module: 'resource-service',
    type: 'yml',
    description: 'Configuration for resource-service (Port 8082, Public Key only)'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/ResourceServiceApplication.java',
    name: 'ResourceServiceApplication.java',
    module: 'resource-service',
    type: 'java',
    description: 'Main Spring Boot 3.4.0 entry point'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/config/ResourceRsaConfiguration.java',
    name: 'ResourceRsaConfiguration.java',
    module: 'resource-service',
    type: 'java',
    description: 'Configures stateless NimbusJwtDecoder with local RSAPublicKey or JWKS'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/config/ResourceSecurityConfig.java',
    name: 'ResourceSecurityConfig.java',
    module: 'resource-service',
    type: 'java',
    description: 'Spring Security 6.4 OAuth2 Resource Server filter chain'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/client/SecureCryptoClient.java',
    name: 'SecureCryptoClient.java',
    module: 'resource-service',
    type: 'java',
    description: 'Helper client demonstrating public key encryption before sending to auth-service'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/controller/SecureDataController.java',
    name: 'SecureDataController.java',
    module: 'resource-service',
    type: 'java',
    description: 'Protected endpoint GET /api/v1/data/secure-info and secret forwarder'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/controller/ClientDemoController.java',
    name: 'ClientDemoController.java',
    module: 'resource-service',
    type: 'java',
    description: 'Diagnostic endpoints for client payload encryption & round-trip testing'
  },
  {
    path: '/resource-service/src/main/java/com/security/rsa/resource/exception/ResourceExceptionHandler.java',
    name: 'ResourceExceptionHandler.java',
    module: 'resource-service',
    type: 'java',
    description: '@RestControllerAdvice for OAuth2 Bearer token and security exceptions'
  },
  {
    path: '/resource-service/src/main/resources/keys/public_key.pem',
    name: 'public_key.pem',
    module: 'resource-service',
    type: 'pem',
    description: 'RSA Public Key in X.509 format (ZERO Private Key exposure)'
  },
  // scripts
  {
    path: '/scripts/generate-keys.sh',
    name: 'generate-keys.sh',
    module: 'scripts',
    type: 'sh',
    description: 'OpenSSL script generating PKCS#8 private key and X.509 public key'
  },
  {
    path: '/scripts/run-services.sh',
    name: 'run-services.sh',
    module: 'scripts',
    type: 'sh',
    description: 'Bash runner for compiling Maven modules and starting microservices'
  },
  {
    path: '/scripts/demo-flow.sh',
    name: 'demo-flow.sh',
    module: 'scripts',
    type: 'sh',
    description: 'Full cURL end-to-end automated verification script'
  }
];
