package com.security.rsa.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.ComponentScan;

/**
 * Main application entry point for auth-service (Port 8081).
 * Token Issuer and Cryptographic Key Owner.
 */
@SpringBootApplication
@ComponentScan(basePackages = {"com.security.rsa.auth", "com.security.rsa.common"})
@ConfigurationPropertiesScan(basePackages = {"com.security.rsa.common.config"})
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
