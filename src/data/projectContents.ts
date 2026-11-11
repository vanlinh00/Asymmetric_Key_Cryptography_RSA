/**
 * Complete in-memory repository of all Maven microservice source code,
 * configuration, Docker, OpenSSL scripts, and PEM keys.
 */

export const FILE_CONTENTS: Record<string, string> = {
  '/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.0</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>

    <groupId>com.security.rsa</groupId>
    <artifactId>rsa-cryptography-microservices</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>RSA Cryptography Microservices Parent</name>
    <description>Multi-module Maven demonstration project for Asymmetric Key Cryptography (RSA), Spring Boot 3.4.0, Spring Security 6.4, and Nimbus JOSE</description>

    <modules>
        <module>crypto-common</module>
        <module>auth-service</module>
        <module>resource-service</module>
    </modules>

    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring-boot.version>3.4.0</spring-boot.version>
        <nimbus-jose-jwt.version>9.47</nimbus-jose-jwt.version>
        <bouncycastle.version>1.78.1</bouncycastle.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <!-- Internal common crypto module -->
            <dependency>
                <groupId>com.security.rsa</groupId>
                <artifactId>crypto-common</artifactId>
                <version>\${project.version}</version>
            </dependency>

            <!-- Nimbus JOSE + JWT -->
            <dependency>
                <groupId>com.nimbusds</groupId>
                <artifactId>nimbus-jose-jwt</artifactId>
                <version>\${nimbus-jose-jwt.version}</version>
            </dependency>

            <!-- Optional Bouncy Castle for advanced PEM/ASN.1 parsing -->
            <dependency>
                <groupId>org.bouncycastle</groupId>
                <artifactId>bcpkix-jdk18on</artifactId>
                <version>\${bouncycastle.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.13.0</version>
                    <configuration>
                        <source>\${java.version}</source>
                        <target>\${java.version}</target>
                        <parameters>true</parameters>
                    </configuration>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>`,

  '/docker-compose.yml': `services:
  auth-service:
    build:
      context: .
      dockerfile: auth-service/Dockerfile
    container_name: auth-service
    ports:
      - "8081:8081"
    environment:
      - SERVER_PORT=8081
      - RSA_ISSUER=http://auth-service:8081
    networks:
      - crypto-net

  resource-service:
    build:
      context: .
      dockerfile: resource-service/Dockerfile
    container_name: resource-service
    ports:
      - "8082:8082"
    environment:
      - SERVER_PORT=8082
      - RSA_ISSUER=http://auth-service:8081
      - RSA_AUTH_SERVICE_URL=http://auth-service:8081
      - SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI=http://auth-service:8081/.well-known/jwks.json
    depends_on:
      - auth-service
    networks:
      - crypto-net

networks:
  crypto-net:
    driver: bridge`,

  '/README.md': `# Asymmetric Key Cryptography (RSA) in Java 17 & Spring Boot 3.4 Microservices

A production-grade multi-module Maven microservices reference architecture implementing **Asymmetric Key Cryptography (RSA)**, **RS256 JWT Token Issuance**, **RFC 7517 JWKS Discovery**, and **Java Cryptography Architecture (JCA)** payload encryption with Spring Boot 3.4.0 and Spring Security 6.4.

> *"Asymmetric keys (like RS256): It uses a pair of keys. The Auth server uses a Private Key to create the token, while other servers use a Public Key to verify it. This is safer for microservices."*

## Why RS256 is Safer for Microservices than HS256:
- **Zero Shared Secrets**: Only auth-service holds the Private Key. Downstream servers only hold the Public Key.
- **Blast Radius Containment**: If a downstream service is compromised, the attacker only gets a Public Key, which CANNOT forge tokens.
- **Stateless Offline Verification**: Downstream services verify tokens locally via mathematics without contacting auth-service.
- **Zero-Downtime Key Rotation**: Dynamic RFC 7517 JWKS allows rotating keys via kid without redeploying microservices.

## System Components:
1. **auth-service (Port 8081)**: Token Issuer & Key Owner (holds private_key.pem securely)
2. **resource-service (Port 8082)**: Downstream Resource Server (holds public_key.pem only)
3. **crypto-common**: Shared KeyFactory utilities and RSA-OAEP cipher service

## Quick Start:
\`\`\`bash
mvn clean package -DskipTests
./scripts/run-services.sh
./scripts/demo-flow.sh
\`\`\``,

  '/crypto-common/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.security.rsa</groupId>
        <artifactId>rsa-cryptography-microservices</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>

    <artifactId>crypto-common</artifactId>
    <packaging>jar</packaging>
    <name>Crypto Common Library</name>
    <description>Shared cryptography utilities, Java 17 KeyFactory loaders, RSA JCA cipher services, and DTOs</description>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-configuration-processor</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>com.nimbusds</groupId>
            <artifactId>nimbus-jose-jwt</artifactId>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`,

  '/crypto-common/src/main/java/com/security/rsa/common/util/PemKeyUtils.java': `package com.security.rsa.common.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class demonstrating Java 17 Java Cryptography Architecture (JCA)
 * mechanisms for reading, parsing, and converting RSA Public and Private keys
 * from standard PEM (Privacy-Enhanced Mail) PKCS#8 and X.509 formats.
 */
public final class PemKeyUtils {

    private static final Logger log = LoggerFactory.getLogger(PemKeyUtils.class);
    private static final String RSA_ALGORITHM = "RSA";
    private static final ResourceLoader resourceLoader = new DefaultResourceLoader();

    private PemKeyUtils() {}

    public static RSAPrivateKey parsePrivateKeyFromPem(String pemContent) {
        if (pemContent == null || pemContent.isBlank()) {
            throw new IllegalArgumentException("Private key PEM content must not be null or blank");
        }

        String sanitized = pemContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\\\s+", "");

        try {
            byte[] encodedKey = Base64.getDecoder().decode(sanitized);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
            return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm is not supported by current JCA provider", e);
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("Invalid RSA Private Key specification (ensure PKCS#8 format)", e);
        }
    }

    public static RSAPublicKey parsePublicKeyFromPem(String pemContent) {
        if (pemContent == null || pemContent.isBlank()) {
            throw new IllegalArgumentException("Public key PEM content must not be null or blank");
        }

        String sanitized = pemContent
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("-----BEGIN RSA PUBLIC KEY-----", "")
                .replace("-----END RSA PUBLIC KEY-----", "")
                .replaceAll("\\\\s+", "");

        try {
            byte[] encodedKey = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
            return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm is not supported by current JCA provider", e);
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("Invalid RSA Public Key specification (ensure X.509 format)", e);
        }
    }

    public static String readResourceContent(String location) {
        try {
            Resource resource = resourceLoader.getResource(location);
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read key resource from location: " + location, e);
        }
    }

    public static RSAPrivateKey loadPrivateKey(String location) {
        log.info("Loading RSA Private Key from: {}", location);
        return parsePrivateKeyFromPem(readResourceContent(location));
    }

    public static RSAPublicKey loadPublicKey(String location) {
        log.info("Loading RSA Public Key from: {}", location);
        return parsePublicKeyFromPem(readResourceContent(location));
    }

    public static String toPem(RSAPublicKey publicKey) {
        String base64 = Base64.getEncoder().encodeToString(publicKey.getEncoded());
        return wrapInPem(base64, "PUBLIC KEY");
    }

    public static String toPem(RSAPrivateKey privateKey) {
        String base64 = Base64.getEncoder().encodeToString(privateKey.getEncoded());
        return wrapInPem(base64, "PRIVATE KEY");
    }

    private static String wrapInPem(String base64, String type) {
        StringBuilder sb = new StringBuilder();
        sb.append("-----BEGIN ").append(type).append("-----\\n");
        int index = 0;
        while (index < base64.length()) {
            sb.append(base64, index, Math.min(index + 64, base64.length())).append("\\n");
            index += 64;
        }
        sb.append("-----END ").append(type).append("-----\\n");
        return sb.toString();
    }

    public static Map<String, Object> toJwkMap(RSAPublicKey publicKey, String keyId) {
        Map<String, Object> jwk = new HashMap<>();
        jwk.put("kty", "RSA");
        jwk.put("use", "sig");
        jwk.put("alg", "RS256");
        jwk.put("kid", keyId);
        jwk.put("n", encodeBigIntegerBase64Url(publicKey.getModulus()));
        jwk.put("e", encodeBigIntegerBase64Url(publicKey.getPublicExponent()));
        return jwk;
    }

    public static String encodeBigIntegerBase64Url(BigInteger value) {
        byte[] bytes = value.toByteArray();
        if (bytes.length > 0 && bytes[0] == 0) {
            byte[] trimmed = new byte[bytes.length - 1];
            System.arraycopy(bytes, 1, trimmed, 0, trimmed.length);
            bytes = trimmed;
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}`,

  '/crypto-common/src/main/java/com/security/rsa/common/crypto/RsaCryptoService.java': `package com.security.rsa.common.crypto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.MGF1ParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.util.Base64;

@Service
public class RsaCryptoService {

    private static final Logger log = LoggerFactory.getLogger(RsaCryptoService.class);
    public static final String TRANSFORMATION_OAEP = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";

    private final OAEPParameterSpec oaepParameterSpec;

    public RsaCryptoService() {
        this.oaepParameterSpec = new OAEPParameterSpec(
                "SHA-256",
                "MGF1",
                MGF1ParameterSpec.SHA256,
                PSource.PSpecified.DEFAULT
        );
    }

    public String encryptWithPublicKey(String plainText, RSAPublicKey publicKey) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION_OAEP);
            cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParameterSpec);
            byte[] cipherBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(cipherBytes);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed: " + e.getMessage(), e);
        }
    }

    public String decryptWithPrivateKey(String base64Ciphertext, RSAPrivateKey privateKey) {
        try {
            byte[] cipherBytes = Base64.getDecoder().decode(base64Ciphertext.trim());
            Cipher cipher = Cipher.getInstance(TRANSFORMATION_OAEP);
            cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParameterSpec);
            byte[] decryptedBytes = cipher.doFinal(cipherBytes);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new SecurityException("Cryptographic operation failed: unable to decrypt payload", e);
        }
    }
}`,

  '/crypto-common/src/main/java/com/security/rsa/common/crypto/AsymmetricKeyGenerator.java': `package com.security.rsa.common.crypto;

import com.security.rsa.common.util.PemKeyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

public final class AsymmetricKeyGenerator {
    private static final Logger log = LoggerFactory.getLogger(AsymmetricKeyGenerator.class);

    private AsymmetricKeyGenerator() {}

    public static KeyPair generateRsaKeyPair(int keySize) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(keySize, SecureRandom.getInstanceStrong());
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Failed to initialize RSA KeyPairGenerator", e);
        }
    }

    public record GeneratedPemKeyPair(String publicKeyPem, String privateKeyPem, int keySize) {}

    public static GeneratedPemKeyPair generatePemKeyPair(int keySize) {
        KeyPair keyPair = generateRsaKeyPair(keySize);
        String pubPem = PemKeyUtils.toPem((RSAPublicKey) keyPair.getPublic());
        String privPem = PemKeyUtils.toPem((RSAPrivateKey) keyPair.getPrivate());
        return new GeneratedPemKeyPair(pubPem, privPem, keySize);
    }
}`,

  '/crypto-common/src/main/java/com/security/rsa/common/config/RsaKeyProperties.java': `package com.security.rsa.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "rsa")
@Validated
public class RsaKeyProperties {
    private String privateKeyLocation;
    private String publicKeyLocation;
    private String keyId = "rsa-auth-key-1";
    private String issuer = "http://localhost:8081";
    private long tokenTtlSeconds = 3600;
    private String cipherTransformation = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";

    public String getPrivateKeyLocation() { return privateKeyLocation; }
    public void setPrivateKeyLocation(String privateKeyLocation) { this.privateKeyLocation = privateKeyLocation; }
    public String getPublicKeyLocation() { return publicKeyLocation; }
    public void setPublicKeyLocation(String publicKeyLocation) { this.publicKeyLocation = publicKeyLocation; }
    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public long getTokenTtlSeconds() { return tokenTtlSeconds; }
    public void setTokenTtlSeconds(long tokenTtlSeconds) { this.tokenTtlSeconds = tokenTtlSeconds; }
    public String getCipherTransformation() { return cipherTransformation; }
    public void setCipherTransformation(String cipherTransformation) { this.cipherTransformation = cipherTransformation; }
}`,

  '/auth-service/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.security.rsa</groupId>
        <artifactId>rsa-cryptography-microservices</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>
    <artifactId>auth-service</artifactId>
    <packaging>jar</packaging>
    <name>Auth Service</name>
    <dependencies>
        <dependency>
            <groupId>com.security.rsa</groupId>
            <artifactId>crypto-common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>com.nimbusds</groupId>
            <artifactId>nimbus-jose-jwt</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`,

  '/auth-service/src/main/resources/application.yml': `server:
  port: 8081
  servlet:
    context-path: /

spring:
  application:
    name: auth-service

rsa:
  private-key-location: classpath:keys/private_key.pem
  public-key-location: classpath:keys/public_key.pem
  key-id: rsa-auth-key-1
  issuer: http://localhost:8081
  token-ttl-seconds: 3600
  cipher-transformation: RSA/ECB/OAEPWithSHA-256AndMGF1Padding`,

  '/auth-service/src/main/java/com/security/rsa/auth/config/RsaKeyConfiguration.java': `package com.security.rsa.auth.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.security.rsa.common.config.RsaKeyProperties;
import com.security.rsa.common.util.PemKeyUtils;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Configuration
@EnableConfigurationProperties(RsaKeyProperties.class)
public class RsaKeyConfiguration {

    private final RsaKeyProperties properties;

    public RsaKeyConfiguration(RsaKeyProperties properties) {
        this.properties = properties;
    }

    @Bean
    public RSAPrivateKey rsaPrivateKey() {
        return PemKeyUtils.loadPrivateKey(properties.getPrivateKeyLocation());
    }

    @Bean
    public RSAPublicKey rsaPublicKey() {
        return PemKeyUtils.loadPublicKey(properties.getPublicKeyLocation());
    }

    @Bean
    public RSAKey nimbusRsaKey(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(properties.getKeyId())
                .keyUse(KeyUse.SIGNATURE)
                .algorithm(com.nimbusds.jose.JWSAlgorithm.RS256)
                .build();
    }

    @Bean
    public JWKSet jwkSet(RSAKey nimbusRsaKey) {
        return new JWKSet(nimbusRsaKey.toPublicJWK());
    }
}`,

  '/auth-service/src/main/java/com/security/rsa/auth/controller/AuthController.java': `package com.security.rsa.auth.controller;

import com.security.rsa.auth.exception.InvalidCredentialsException;
import com.security.rsa.auth.service.JwtTokenService;
import com.security.rsa.common.model.LoginRequest;
import com.security.rsa.common.model.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;

    private static final Map<String, List<String>> DEMO_USERS = Map.of(
            "admin", List.of("ROLE_ADMIN", "ROLE_USER"),
            "alice", List.of("ROLE_USER"),
            "bob", List.of("ROLE_USER")
    );

    public AuthController(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        List<String> roles = DEMO_USERS.get(loginRequest.username().trim());
        if (roles == null || (!"password123".equals(loginRequest.password()) && !"admin123".equals(loginRequest.password()))) {
            throw new InvalidCredentialsException("Invalid username or password");
        }
        return ResponseEntity.ok(jwtTokenService.generateToken(loginRequest.username(), roles));
    }
}`,

  '/auth-service/src/main/java/com/security/rsa/auth/controller/JwksController.java': `package com.security.rsa.auth.controller;

import com.nimbusds.jose.jwk.JWKSet;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class JwksController {

    private final JWKSet jwkSet;

    public JwksController(JWKSet jwkSet) {
        this.jwkSet = jwkSet;
    }

    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getJwks() {
        return jwkSet.toJSONObject();
    }
}`,

  '/auth-service/src/main/java/com/security/rsa/auth/controller/CryptoController.java': `package com.security.rsa.auth.controller;

import com.security.rsa.auth.service.DecryptionService;
import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/crypto")
public class CryptoController {

    private final DecryptionService decryptionService;

    public CryptoController(DecryptionService decryptionService) {
        this.decryptionService = decryptionService;
    }

    @PostMapping("/decrypt")
    public ResponseEntity<DecryptedPayloadResponse> decryptPayload(@Valid @RequestBody EncryptedPayloadRequest request) {
        return ResponseEntity.ok(decryptionService.decryptPayload(request));
    }
}`,

  '/resource-service/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.security.rsa</groupId>
        <artifactId>rsa-cryptography-microservices</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>
    <artifactId>resource-service</artifactId>
    <packaging>jar</packaging>
    <name>Resource Service</name>
    <dependencies>
        <dependency>
            <groupId>com.security.rsa</groupId>
            <artifactId>crypto-common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`,

  '/resource-service/src/main/resources/application.yml': `server:
  port: 8082
  servlet:
    context-path: /

spring:
  application:
    name: resource-service
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: http://localhost:8081/.well-known/jwks.json
          issuer-uri: http://localhost:8081

rsa:
  public-key-location: classpath:keys/public_key.pem
  key-id: rsa-auth-key-1
  issuer: http://localhost:8081
  cipher-transformation: RSA/ECB/OAEPWithSHA-256AndMGF1Padding
  validation-mode: LOCAL_PUBLIC_KEY
  auth-service-url: http://localhost:8081`,

  '/resource-service/src/main/java/com/security/rsa/resource/config/ResourceRsaConfiguration.java': `package com.security.rsa.resource.config;

import com.security.rsa.common.config.RsaKeyProperties;
import com.security.rsa.common.util.PemKeyUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.interfaces.RSAPublicKey;

@Configuration
@EnableConfigurationProperties(RsaKeyProperties.class)
public class ResourceRsaConfiguration {

    private final RsaKeyProperties properties;

    @Value("\${rsa.validation-mode:LOCAL_PUBLIC_KEY}")
    private String validationMode;

    public ResourceRsaConfiguration(RsaKeyProperties properties) {
        this.properties = properties;
    }

    @Bean
    public RSAPublicKey rsaPublicKey() {
        return PemKeyUtils.loadPublicKey(properties.getPublicKeyLocation());
    }

    @Bean
    public JwtDecoder jwtDecoder(RSAPublicKey publicKey) {
        return NimbusJwtDecoder.withPublicKey(publicKey).build();
    }
}`,

  '/resource-service/src/main/java/com/security/rsa/resource/client/SecureCryptoClient.java': `package com.security.rsa.resource.client;

import com.security.rsa.common.crypto.RsaCryptoService;
import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.security.interfaces.RSAPublicKey;
import java.time.Instant;

@Component
public class SecureCryptoClient {

    private final RSAPublicKey rsaPublicKey;
    private final RsaCryptoService rsaCryptoService;
    private final WebClient authServiceWebClient;

    public SecureCryptoClient(RSAPublicKey rsaPublicKey, RsaCryptoService rsaCryptoService, WebClient authServiceWebClient) {
        this.rsaPublicKey = rsaPublicKey;
        this.rsaCryptoService = rsaCryptoService;
        this.authServiceWebClient = authServiceWebClient;
    }

    public EncryptedPayloadRequest encryptPayload(String plainText) {
        String ciphertext = rsaCryptoService.encryptWithPublicKey(plainText, rsaPublicKey);
        return new EncryptedPayloadRequest(ciphertext, RsaCryptoService.TRANSFORMATION_OAEP, "resource-service", Instant.now().toString());
    }

    public DecryptedPayloadResponse encryptAndTransmitToAuthService(String sensitiveData) {
        EncryptedPayloadRequest request = encryptPayload(sensitiveData);
        return authServiceWebClient.post()
                .uri("/api/v1/crypto/decrypt")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(DecryptedPayloadResponse.class)
                .block();
    }
}`,

  '/resource-service/src/main/java/com/security/rsa/resource/controller/SecureDataController.java': `package com.security.rsa.resource.controller;

import com.security.rsa.common.model.SecureDataResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/data")
public class SecureDataController {

    @GetMapping("/secure-info")
    public ResponseEntity<SecureDataResponse> getSecureInfo(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return ResponseEntity.ok(new SecureDataResponse(
                "Access granted to confidential resource-service domain! JWT verified statelessly using RSA Public Key.",
                jwt.getSubject(),
                jwt.getIssuer().toString(),
                List.of("ROLE_USER"),
                jwt.getClaims(),
                "RSA RS256 Verification (Zero remote network roundtrip)",
                Instant.now()
        ));
    }
}`,

  '/scripts/generate-keys.sh': `#!/usr/bin/env bash
set -euo pipefail

echo "Generating 2048-bit RSA Private Key in PKCS#8 format..."
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem

echo "Extracting RSA Public Key in X.509 SubjectPublicKeyInfo format..."
openssl pkey -in private_key.pem -pubout -out public_key.pem

echo "Verifying ASN.1 DER structure..."
openssl asn1parse -in private_key.pem | head -n 10
openssl asn1parse -in public_key.pem
`,

  '/scripts/demo-flow.sh': `#!/usr/bin/env bash
set -euo pipefail

AUTH_URL="http://localhost:8081"
RESOURCE_URL="http://localhost:8082"

echo "1. Fetch JWKS from auth-service"
curl -s "\$AUTH_URL/.well-known/jwks.json" | jq .

echo "2. Authenticate and get RS256 JWT"
TOKEN=$(curl -s -X POST "\$AUTH_URL/api/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice","password":"password123"}' | jq -r .access_token)

echo "3. Access protected resource on resource-service"
curl -s "\$RESOURCE_URL/api/v1/data/secure-info" \\
  -H "Authorization: Bearer \$TOKEN" | jq .

echo "4. Client encrypts payload and auth-service decrypts"
curl -s -X POST "\$RESOURCE_URL/api/v1/client/demo-roundtrip" \\
  -H "Content-Type: application/json" \\
  -d '{"plaintext":"Sensitive customer secret"}' | jq .
`
};
