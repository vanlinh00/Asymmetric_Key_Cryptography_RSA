package com.security.rsa.auth.controller;

import com.security.rsa.auth.service.DecryptionService;
import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller exposing cryptographic decryption service endpoint.
 * Enables downstream microservices (e.g. resource-service) to send sensitive
 * payloads encrypted with auth-service's public key, which auth-service decrypts
 * using its securely held RSA Private Key.
 */
@RestController
@RequestMapping("/api/v1/crypto")
public class CryptoController {

    private static final Logger log = LoggerFactory.getLogger(CryptoController.class);

    private final DecryptionService decryptionService;

    public CryptoController(DecryptionService decryptionService) {
        this.decryptionService = decryptionService;
    }

    /**
     * Decrypts an inbound asymmetric payload using the local JCA Private Key.
     *
     * @param request Encrypted payload containing Base64 ciphertext
     * @return Decrypted content response
     */
    @PostMapping("/decrypt")
    public ResponseEntity<DecryptedPayloadResponse> decryptPayload(@Valid @RequestBody EncryptedPayloadRequest request) {
        log.info("Processing decryption request from: {}", request.senderService());
        DecryptedPayloadResponse response = decryptionService.decryptPayload(request);
        return ResponseEntity.ok(response);
    }
}
