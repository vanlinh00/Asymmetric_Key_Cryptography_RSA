package com.security.rsa.resource;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.ComponentScan;

/**
 * Main application entry point for resource-service (Port 8082).
 * Downstream OAuth2 Resource Server.
 */
@SpringBootApplication
@ComponentScan(basePackages = {"com.security.rsa.resource", "com.security.rsa.common"})
@ConfigurationPropertiesScan(basePackages = {"com.security.rsa.common.config"})
public class ResourceServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResourceServiceApplication.class, args);
    }
}
