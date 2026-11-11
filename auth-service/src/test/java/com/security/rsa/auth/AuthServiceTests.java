package com.security.rsa.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.rsa.common.model.EncryptedPayloadRequest;
import com.security.rsa.common.model.LoginRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthServiceTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /.well-known/jwks.json should expose RFC 7517 JSON Web Key Set with RSA public key")
    void shouldExposeJwksEndpoint() throws Exception {
        mockMvc.perform(get("/.well-known/jwks.json"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.keys", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.keys[0].kty", is("RSA")))
                .andExpect(jsonPath("$.keys[0].use", is("sig")))
                .andExpect(jsonPath("$.keys[0].alg", is("RS256")))
                .andExpect(jsonPath("$.keys[0].kid", is("rsa-auth-key-1")))
                .andExpect(jsonPath("$.keys[0].n", notNullValue()))
                .andExpect(jsonPath("$.keys[0].e", notNullValue()))
                // Verify private key parameters are NEVER exposed in JWKS!
                .andExpect(jsonPath("$.keys[0].d").doesNotExist())
                .andExpect(jsonPath("$.keys[0].p").doesNotExist())
                .andExpect(jsonPath("$.keys[0].q").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login should authenticate valid user and issue RS256 JWT")
    void shouldAuthenticateAndIssueJwt() throws Exception {
        LoginRequest request = new LoginRequest("alice", "password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andExpect(jsonPath("$.token_type", is("Bearer")))
                .andExpect(jsonPath("$.algorithm", is("RS256")))
                .andExpect(jsonPath("$.key_id", is("rsa-auth-key-1")))
                .andExpect(jsonPath("$.roles", hasItem("ROLE_USER")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with invalid password should return 401 Unauthorized")
    void shouldRejectInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("alice", "wrong_password");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }
}
