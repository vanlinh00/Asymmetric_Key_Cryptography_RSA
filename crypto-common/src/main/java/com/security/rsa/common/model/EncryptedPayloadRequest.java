package com.security.rsa.common.model;

import jakarta.validation.constraints.NotBlank;

public record EncryptedPayloadRequest(
        @NotBlank(message = "Ciphertext must not be blank")
        String ciphertext,

        String algorithm,

        String senderService,

        String timestamp
) {}
