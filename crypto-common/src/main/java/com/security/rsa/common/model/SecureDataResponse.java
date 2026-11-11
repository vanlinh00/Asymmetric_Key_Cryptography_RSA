package com.security.rsa.common.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SecureDataResponse(
        String message,
        String authenticatedSubject,
        String issuer,
        List<String> authorities,
        Map<String, Object> tokenClaims,
        String verificationMethod,
        Instant timestamp
) {}
