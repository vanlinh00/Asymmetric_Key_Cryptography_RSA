package com.security.rsa.auth.controller;

import com.nimbusds.jose.jwk.JWKSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST Controller providing RFC 7517 compliant JSON Web Key Set (JWKS) endpoint.
 * Downstream Resource Servers query GET /.well-known/jwks.json to dynamically
 * retrieve the RSA Public Key for stateless signature verification.
 */
@RestController
public class JwksController {

    private static final Logger log = LoggerFactory.getLogger(JwksController.class);

    private final JWKSet jwkSet;

    public JwksController(JWKSet jwkSet) {
        this.jwkSet = jwkSet;
    }

    /**
     * Serves the JWKS payload containing public RSA parameters (n, e, kid, use, alg).
     *
     * @return Map representing the JSON Web Key Set
     */
    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getJwks() {
        log.debug("Serving JWKS public keys. Number of keys: {}", jwkSet.getKeys().size());
        return jwkSet.toJSONObject();
    }
}
