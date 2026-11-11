package com.security.rsa.common.model;

import java.time.Instant;

public record DecryptedPayloadResponse(
        String decryptedContent,
        String status,
        String decryptedBy,
        String decryptionAlgorithm,
        Instant timestamp
) {
    public static DecryptedPayloadResponse success(String decryptedContent, String algorithm) {
        return new DecryptedPayloadResponse(
                decryptedContent,
                "SUCCESS",
                "auth-service (JCA Private Key Decryptor)",
                algorithm,
                Instant.now()
        );
    }
}
