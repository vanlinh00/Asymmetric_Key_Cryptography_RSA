package com.security.rsa.resource;

import com.security.rsa.common.model.LoginRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ResourceServiceTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/data/secure-info without Bearer token must return 401 Unauthorized")
    void shouldDenyUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/v1/data/secure-info"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/data/secure-info with authenticated MockUser JWT should return 200 OK")
    @WithMockUser(username = "alice", authorities = {"ROLE_USER"})
    void shouldPermitAuthenticatedAccess() throws Exception {
        // MockMvc with mock user bypasses raw cryptographic signature for controller layer verification
        mockMvc.perform(get("/api/v1/data/secure-info"))
                .andExpect(status().isOk());
    }
}
