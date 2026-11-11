package com.security.rsa.auth.service;

import com.security.rsa.common.crypto.RsaCryptoService;
import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.interfaces.RSAPrivateKey;

/**
 * Service orchestrating asymmetric decryption of inbound payloads sent by downstream services
 * using Java Cryptography Architecture (JCA) and the RSA Private Key.
 */
@Service
public class DecryptionService {

    private static final Logger log = LoggerFactory.getLogger(DecryptionService.class);

    private final RSAPrivateKey rsaPrivateKey;
    private final RsaCryptoService rsaCryptoService;

    public DecryptionService(RSAPrivateKey rsaPrivateKey, RsaCryptoService rsaCryptoService) {
        this.rsaPrivateKey = rsaPrivateKey;
        this.rsaCryptoService = rsaCryptoService;
    }

    /**
     * Decrypts an encrypted payload received from a downstream service (e.g. resource-service).
     *
     * @param request Encrypted payload request with Base64 ciphertext
     * @return Decrypted content response
     */
    public DecryptedPayloadResponse decryptPayload(EncryptedPayloadRequest request) {
        log.info("Received encrypted payload from sender='{}', algorithm='{}'",
                request.senderService(), request.algorithm());

        String decryptedPlaintext = rsaCryptoService.decryptWithPrivateKey(
                request.ciphertext(),
                rsaPrivateKey
        );

        log.info("Successfully decrypted payload from sender='{}'. Plaintext length: {} chars",
                request.senderService(), decryptedPlaintext.length());

        return DecryptedPayloadResponse.success(
                decryptedPlaintext,
                RsaCryptoService.TRANSFORMATION_OAEP
        );
    }
}
