package com.security.rsa.resource.client;

import com.security.rsa.common.crypto.RsaCryptoService;
import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.security.interfaces.RSAPublicKey;
import java.time.Instant;

/**
 * Helper client class demonstrating Asymmetric Payload Confidentiality.
 *
 * Demonstrates:
 * 1) Encrypting sensitive payloads downstream using ONLY the RSA Public Key.
 * 2) Transmitting the ciphertext to upstream auth-service over HTTP.
 * 3) Proving that even if this payload is intercepted on the internal network,
 *    only auth-service possessing the private_key.pem can decrypt it.
 */
@Component
public class SecureCryptoClient {

    private static final Logger log = LoggerFactory.getLogger(SecureCryptoClient.class);

    private final RSAPublicKey rsaPublicKey;
    private final RsaCryptoService rsaCryptoService;
    private final WebClient authServiceWebClient;

    public SecureCryptoClient(RSAPublicKey rsaPublicKey,
                              RsaCryptoService rsaCryptoService,
                              WebClient authServiceWebClient) {
        this.rsaPublicKey = rsaPublicKey;
        this.rsaCryptoService = rsaCryptoService;
        this.authServiceWebClient = authServiceWebClient;
    }

    /**
     * Encrypts plaintext using the RSA Public Key (RSA/ECB/OAEPWithSHA-256AndMGF1Padding).
     *
     * @param plainText Sensitive message to encrypt
     * @return EncryptedPayloadRequest containing Base64 ciphertext
     */
    public EncryptedPayloadRequest encryptPayload(String plainText) {
        log.info("Encrypting sensitive payload with RSA Public Key (Key size: {} bits)",
                rsaPublicKey.getModulus().bitLength());

        String ciphertext = rsaCryptoService.encryptWithPublicKey(plainText, rsaPublicKey);

        return new EncryptedPayloadRequest(
                ciphertext,
                RsaCryptoService.TRANSFORMATION_OAEP,
                "resource-service",
                Instant.now().toString()
        );
    }

    /**
     * Encrypts plaintext and transmits it via HTTP to auth-service's /api/v1/crypto/decrypt endpoint.
     *
     * @param sensitiveData Plaintext sensitive data
     * @return DecryptedPayloadResponse received from auth-service
     */
    public DecryptedPayloadResponse encryptAndTransmitToAuthService(String sensitiveData) {
        EncryptedPayloadRequest request = encryptPayload(sensitiveData);

        log.info("Transmitting encrypted payload (length: {} chars) to auth-service /api/v1/crypto/decrypt",
                request.ciphertext().length());

        return authServiceWebClient.post()
                .uri("/api/v1/crypto/decrypt")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(DecryptedPayloadResponse.class)
                .onErrorResume(ex -> {
                    log.error("Failed to transmit encrypted payload to auth-service", ex);
                    return Mono.error(new RuntimeException("Downstream crypto dispatch failed: " + ex.getMessage(), ex));
                })
                .block();
    }
}
