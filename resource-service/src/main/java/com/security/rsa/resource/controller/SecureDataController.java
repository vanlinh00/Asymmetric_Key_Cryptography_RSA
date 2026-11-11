package com.security.rsa.resource.controller;

import com.security.rsa.common.model.DecryptedPayloadResponse;
import com.security.rsa.common.model.SecureDataResponse;
import com.security.rsa.resource.client.SecureCryptoClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Protected Business REST Controller in resource-service.
 * Demonstrates:
 * 1) Requiring a valid RS256 Bearer JWT signed by auth-service.
 * 2) Extracting cryptographic claims (sub, iss, roles, aud) validated purely via local RSA Public Key.
 * 3) Using the SecureCryptoClient to encrypt and forward sensitive data to auth-service.
 */
@RestController
@RequestMapping("/api/v1/data")
public class SecureDataController {

    private static final Logger log = LoggerFactory.getLogger(SecureDataController.class);

    private final SecureCryptoClient secureCryptoClient;

    public SecureDataController(SecureCryptoClient secureCryptoClient) {
        this.secureCryptoClient = secureCryptoClient;
    }

    /**
     * Protected endpoint GET /api/v1/data/secure-info.
     * Validates incoming Bearer token using RSA Public Key without contacting auth-service.
     */
    @GetMapping("/secure-info")
    public ResponseEntity<SecureDataResponse> getSecureInfo(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();

        log.info("Access granted to protected endpoint for subject: '{}', keyId: '{}'",
                jwt.getSubject(), jwt.getHeader("kid"));

        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        SecureDataResponse response = new SecureDataResponse(
                "Access granted to confidential resource-service domain! JWT verified statelessly using RSA Public Key.",
                jwt.getSubject(),
                jwt.getIssuer() != null ? jwt.getIssuer().toString() : "unknown",
                authorities,
                jwt.getClaims(),
                "RSA RS256 Verification (Zero remote network roundtrip)",
                Instant.now()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Protected endpoint that demonstrates encrypting downstream data with the public key
     * and transmitting it to auth-service for decryption.
     */
    @PostMapping("/transmit-secret")
    public ResponseEntity<Map<String, Object>> transmitSecret(@RequestBody Map<String, String> body,
                                                              Authentication authentication) {
        String secretMessage = body.getOrDefault("secretMessage", "Default downstream confidential data: CreditCard=4111-XXXX-XXXX-1111");
        log.info("User '{}' requested secret payload transmission to auth-service", authentication.getName());

        DecryptedPayloadResponse upstreamResponse = secureCryptoClient.encryptAndTransmitToAuthService(secretMessage);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "initiatedBy", authentication.getName(),
                "originalSecretLength", secretMessage.length(),
                "upstreamDecryptionResult", upstreamResponse
        ));
    }
}
