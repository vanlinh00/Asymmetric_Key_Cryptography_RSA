package com.security.rsa.resource.config;

import com.security.rsa.common.config.RsaKeyProperties;
import com.security.rsa.common.util.PemKeyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.reactive.function.client.WebClient;

import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Spring Configuration for resource-service.
 * Demonstrates:
 * 1) Loading ONLY the RSA Public Key from application.yml via @ConfigurationProperties.
 * 2) Creating a stateless NimbusJwtDecoder bean that verifies incoming RS256 JWT signatures
 *    WITHOUT making remote RPC calls back to auth-service.
 * 3) Configuring JWT claim conversion and role mapping.
 */
@Configuration
@EnableConfigurationProperties(RsaKeyProperties.class)
public class ResourceRsaConfiguration {

    private static final Logger log = LoggerFactory.getLogger(ResourceRsaConfiguration.class);

    private final RsaKeyProperties properties;

    @Value("${rsa.validation-mode:LOCAL_PUBLIC_KEY}")
    private String validationMode;

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:http://localhost:8081/.well-known/jwks.json}")
    private String jwkSetUri;

    @Value("${rsa.auth-service-url:http://localhost:8081}")
    private String authServiceUrl;

    public ResourceRsaConfiguration(RsaKeyProperties properties) {
        this.properties = properties;
    }

    /**
     * Binds the RSA Public Key bean using Java 17 KeyFactory.
     * Note: resource-service does NOT have any private key configured.
     */
    @Bean
    public RSAPublicKey rsaPublicKey() {
        log.info("resource-service: Loading RSA Public Key from location: {}", properties.getPublicKeyLocation());
        return PemKeyUtils.loadPublicKey(properties.getPublicKeyLocation());
    }

    /**
     * Configures the Spring Security JwtDecoder bean.
     * Supports both:
     * - Local Public Key verification (zero network latency, pure offline mathematical verification)
     * - Dynamic JWKS endpoint verification (fetches from auth-service JWKS)
     */
    @Bean
    @Primary
    public JwtDecoder jwtDecoder(RSAPublicKey publicKey) {
        NimbusJwtDecoder decoder;

        if ("DYNAMIC_JWKS".equalsIgnoreCase(validationMode)) {
            log.info("resource-service: Initializing dynamic JwtDecoder using JWKS URI: {}", jwkSetUri);
            decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        } else {
            log.info("resource-service: Initializing offline JwtDecoder using local RSA Public Key bean");
            decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        }

        // Add standard token validators: Timestamp with clock skew + Issuer validation
        OAuth2TokenValidator<Jwt> timestampValidator = new JwtTimestampValidator(Duration.ofSeconds(30));
        OAuth2TokenValidator<Jwt> issuerValidator = new JwtClaimValidator<String>(
                "iss",
                iss -> iss != null && iss.equals(properties.getIssuer())
        );

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestampValidator, issuerValidator));
        return decoder;
    }

    /**
     * Custom JWT authentication converter that extracts authorities from the custom "roles" claim
     * (e.g. ["ROLE_ADMIN", "ROLE_USER"]) and maps them to Spring Security GrantedAuthorities.
     */
    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
            return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
        };
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Object rolesObj = jwt.getClaims().get("roles");
        if (rolesObj instanceof List<?> roleList) {
            return roleList.stream()
                    .map(Object::toString)
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    /**
     * WebClient bean for downstream-to-upstream communication (e.g., transmitting encrypted secrets to auth-service).
     */
    @Bean
    public WebClient authServiceWebClient() {
        return WebClient.builder()
                .baseUrl(authServiceUrl)
                .build();
    }
}
