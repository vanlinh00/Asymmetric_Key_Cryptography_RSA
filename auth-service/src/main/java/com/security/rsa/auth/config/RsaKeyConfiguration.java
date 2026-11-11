package com.security.rsa.auth.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.security.rsa.common.config.RsaKeyProperties;
import com.security.rsa.common.util.PemKeyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Spring Configuration responsible for loading RSA Cryptographic Key pairs
 * from file/classpath locations declared in application.yml.
 * Exposes RSAPrivateKey, RSAPublicKey, and RFC 7517 Nimbus RSAKey beans.
 */
@Configuration
@EnableConfigurationProperties(RsaKeyProperties.class)
public class RsaKeyConfiguration {

    private static final Logger log = LoggerFactory.getLogger(RsaKeyConfiguration.class);

    private final RsaKeyProperties properties;

    public RsaKeyConfiguration(RsaKeyProperties properties) {
        this.properties = properties;
    }

    /**
     * Loads the RSA Private Key securely into a Spring Bean.
     * Note: In production, private keys should be loaded from Vault or HSM.
     */
    @Bean
    public RSAPrivateKey rsaPrivateKey() {
        log.info("Binding RSAPrivateKey bean from location: {}", properties.getPrivateKeyLocation());
        return PemKeyUtils.loadPrivateKey(properties.getPrivateKeyLocation());
    }

    /**
     * Loads the RSA Public Key matching the private key.
     */
    @Bean
    public RSAPublicKey rsaPublicKey() {
        log.info("Binding RSAPublicKey bean from location: {}", properties.getPublicKeyLocation());
        return PemKeyUtils.loadPublicKey(properties.getPublicKeyLocation());
    }

    /**
     * Constructs a Nimbus RSAKey object containing both public and private components,
     * configured with KeyId (kid), algorithm (RS256), and KeyUse (SIG).
     */
    @Bean
    public RSAKey nimbusRsaKey(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
        log.info("Configuring Nimbus RSAKey with kid='{}'", properties.getKeyId());
        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(properties.getKeyId())
                .keyUse(KeyUse.SIGNATURE)
                .algorithm(com.nimbusds.jose.JWSAlgorithm.RS256)
                .build();
    }

    /**
     * Exposes the RFC 7517 JSON Web Key Set (JWKS) containing the Public Key.
     * Private key material is intentionally stripped by calling .toPublicJWK().
     */
    @Bean
    public JWKSet jwkSet(RSAKey nimbusRsaKey) {
        log.info("Constructing Public JWKSet for kid='{}'", nimbusRsaKey.getKeyID());
        return new JWKSet(nimbusRsaKey.toPublicJWK());
    }
}
