package com.security.rsa.resource.controller;

import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import com.security.rsa.resource.client.SecureCryptoClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller demonstrating the client encryption helper without requiring authentication,
 * suitable for educational inspection and diagnostic testing of JCA RSA-OAEP.
 */
@RestController
@RequestMapping("/api/v1/client")
public class ClientDemoController {

    private final SecureCryptoClient secureCryptoClient;

    public ClientDemoController(SecureCryptoClient secureCryptoClient) {
        this.secureCryptoClient = secureCryptoClient;
    }

    /**
     * Demonstrates local encryption with the RSA Public Key.
     */
    @PostMapping("/demo-encrypt")
    public ResponseEntity<EncryptedPayloadRequest> demoEncrypt(@RequestBody Map<String, String> payload) {
        String data = payload.getOrDefault("plaintext", "Classified Payload: Database Secret 4829-AF");
        EncryptedPayloadRequest encrypted = secureCryptoClient.encryptPayload(data);
        return ResponseEntity.ok(encrypted);
    }

    /**
     * Demonstrates the complete downstream-to-upstream encryption and decryption round-trip.
     */
    @PostMapping("/demo-roundtrip")
    public ResponseEntity<Map<String, Object>> demoRoundTrip(@RequestBody Map<String, String> payload) {
        String data = payload.getOrDefault("plaintext", "Confidential Customer PII: SSN=000-12-3456");
        EncryptedPayloadRequest encrypted = secureCryptoClient.encryptPayload(data);
        DecryptedPayloadResponse decrypted = secureCryptoClient.encryptAndTransmitToAuthService(data);

        return ResponseEntity.ok(Map.of(
                "plaintext", data,
                "ciphertext", encrypted.ciphertext(),
                "algorithm", encrypted.algorithm(),
                "authServiceDecryptionResult", decrypted
        ));
    }
}
