package com.security.rsa.auth.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.security.rsa.common.config.RsaKeyProperties;
import com.security.rsa.common.model.TokenResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for generating and signing RFC 7519 JSON Web Tokens (JWT)
 * using RSA Signature with SHA-256 (RS256) via Nimbus JOSE + JWT.
 *
 * Cryptographic principle:
 * The signature is computed using the RSA Private Key (d, n) and can be verified
 * by any downstream service using ONLY the corresponding RSA Public Key (e, n).
 */
@Service
public class JwtTokenService {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);

    private final RSAPrivateKey rsaPrivateKey;
    private final RsaKeyProperties rsaKeyProperties;

    public JwtTokenService(RSAPrivateKey rsaPrivateKey, RsaKeyProperties rsaKeyProperties) {
        this.rsaPrivateKey = rsaPrivateKey;
        this.rsaKeyProperties = rsaKeyProperties;
    }

    /**
     * Issues an RS256-signed JWT for the given username and assigned roles.
     *
     * @param username authenticated principal
     * @param roles    list of authorities (e.g. ROLE_USER, ROLE_ADMIN)
     * @return TokenResponse containing serialized JWT and metadata
     */
    public TokenResponse generateToken(String username, List<String> roles) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(rsaKeyProperties.getTokenTtlSeconds());

        // 1. Build JWT Header with Algorithm and Key ID
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                .type(JOSEObjectType.JWT)
                .keyID(rsaKeyProperties.getKeyId())
                .build();

        // 2. Build JWT Claims Set (RFC 7519 standard and custom claims)
        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer(rsaKeyProperties.getIssuer())
                .subject(username)
                .audience("resource-service")
                .issueTime(Date.from(now))
                .notBeforeTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .jwtID(UUID.randomUUID().toString())
                .claim("roles", roles)
                .claim("scope", "read write")
                .claim("email", username + "@security.demo")
                .claim("auth_provider", "auth-service-jca")
                .build();

        // 3. Construct SignedJWT and apply RSA Private Key signature
        SignedJWT signedJWT = new SignedJWT(header, claimsSet);
        try {
            RSASSASigner signer = new RSASSASigner(rsaPrivateKey);
            signedJWT.sign(signer);
            String serializedToken = signedJWT.serialize();
            log.info("Issued RS256 JWT for user '{}', kid='{}', expires at {}", username, rsaKeyProperties.getKeyId(), expiry);

            return TokenResponse.of(
                    serializedToken,
                    rsaKeyProperties.getTokenTtlSeconds(),
                    rsaKeyProperties.getKeyId(),
                    roles
            );
        } catch (JOSEException e) {
            log.error("Cryptographic signing error for user '{}'", username, e);
            throw new IllegalStateException("Failed to sign JWT with RSA private key", e);
        }
    }
}
