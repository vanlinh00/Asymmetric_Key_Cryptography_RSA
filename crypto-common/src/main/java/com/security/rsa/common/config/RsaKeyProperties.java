package com.security.rsa.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Type-safe configuration properties for RSA key locations, algorithm settings,
 * and key identifiers bound from application.yml via @ConfigurationProperties(prefix = "rsa").
 */
@ConfigurationProperties(prefix = "rsa")
@Validated
public class RsaKeyProperties {

    /**
     * Location of the RSA Private Key (e.g. "classpath:keys/private_key.pem" or "file:/etc/secrets/private_key.pem").
     * Stored ONLY in auth-service.
     */
    private String privateKeyLocation;

    /**
     * Location of the RSA Public Key (e.g. "classpath:keys/public_key.pem").
     */
    private String publicKeyLocation;

    /**
     * Key Identifier (kid) matching RFC 7517 for JWKS and JWT header routing.
     */
    private String keyId = "rsa-auth-key-1";

    /**
     * Token Issuer claim (iss).
     */
    private String issuer = "http://localhost:8081";

    /**
     * Token validity duration in seconds (default: 3600s = 1 hour).
     */
    private long tokenTtlSeconds = 3600;

    /**
     * Cryptographic cipher transformation for asymmetric encryption/decryption.
     */
    private String cipherTransformation = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";

    public String getPrivateKeyLocation() {
        return privateKeyLocation;
    }

    public void setPrivateKeyLocation(String privateKeyLocation) {
        this.privateKeyLocation = privateKeyLocation;
    }

    public String getPublicKeyLocation() {
        return publicKeyLocation;
    }

    public void setPublicKeyLocation(String publicKeyLocation) {
        this.publicKeyLocation = publicKeyLocation;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public long getTokenTtlSeconds() {
        return tokenTtlSeconds;
    }

    public void setTokenTtlSeconds(long tokenTtlSeconds) {
        this.tokenTtlSeconds = tokenTtlSeconds;
    }

    public String getCipherTransformation() {
        return cipherTransformation;
    }

    public void setCipherTransformation(String cipherTransformation) {
        this.cipherTransformation = cipherTransformation;
    }
}
