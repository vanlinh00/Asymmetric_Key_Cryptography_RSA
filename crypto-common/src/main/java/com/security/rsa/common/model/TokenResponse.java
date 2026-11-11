package com.security.rsa.common.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record TokenResponse(
        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("token_type")
        String tokenType,

        @JsonProperty("expires_in")
        long expiresIn,

        @JsonProperty("algorithm")
        String algorithm,

        @JsonProperty("key_id")
        String keyId,

        @JsonProperty("roles")
        List<String> roles
) {
    public static TokenResponse of(String token, long expiresIn, String keyId, List<String> roles) {
        return new TokenResponse(token, "Bearer", expiresIn, "RS256", keyId, roles);
    }
}
