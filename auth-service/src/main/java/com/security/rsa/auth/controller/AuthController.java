package com.security.rsa.auth.controller;

import com.security.rsa.auth.exception.InvalidCredentialsException;
import com.security.rsa.auth.service.JwtTokenService;
import com.security.rsa.common.model.LoginRequest;
import com.security.rsa.common.model.TokenResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing authentication endpoint POST /api/v1/auth/login.
 * Authenticates users and issues RS256-signed JWTs.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final JwtTokenService jwtTokenService;

    // Demo in-memory credential repository with corresponding role assignments
    private static final Map<String, UserCredentials> DEMO_CREDENTIALS = Map.of(
            "admin", new UserCredentials("admin123", List.of("ROLE_ADMIN", "ROLE_USER")),
            "alice", new UserCredentials("password123", List.of("ROLE_USER")),
            "bob", new UserCredentials("password123", List.of("ROLE_USER"))
    );

    public AuthController(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * Authenticates demo credentials and issues an RS256-signed JWT token.
     *
     * @param loginRequest username and password
     * @return TokenResponse with access_token and metadata
     */
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("Received login request for username: {}", loginRequest.username());

        UserCredentials user = DEMO_CREDENTIALS.get(loginRequest.username().trim());
        if (user == null || !user.password().equals(loginRequest.password())) {
            log.warn("Authentication failed for username: {}", loginRequest.username());
            throw new InvalidCredentialsException("Invalid username or password");
        }

        TokenResponse token = jwtTokenService.generateToken(loginRequest.username(), user.roles());
        return ResponseEntity.ok(token);
    }

    private record UserCredentials(String password, List<String> roles) {}
}
