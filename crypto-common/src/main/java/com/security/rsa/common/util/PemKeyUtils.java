package com.security.rsa.common.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class demonstrating Java 17 Java Cryptography Architecture (JCA)
 * mechanisms for reading, parsing, and converting RSA Public and Private keys
 * from standard PEM (Privacy-Enhanced Mail) PKCS#8 and X.509 formats.
 */
public final class PemKeyUtils {

    private static final Logger log = LoggerFactory.getLogger(PemKeyUtils.class);
    private static final String RSA_ALGORITHM = "RSA";
    private static final ResourceLoader resourceLoader = new DefaultResourceLoader();

    private PemKeyUtils() {
        // Utility class
    }

    /**
     * Reads and parses an RSA Private Key encoded in PKCS#8 format.
     *
     * @param pemContent raw PEM string containing BEGIN PRIVATE KEY
     * @return RSAPrivateKey instance instantiated via JCA KeyFactory
     */
    public static RSAPrivateKey parsePrivateKeyFromPem(String pemContent) {
        if (pemContent == null || pemContent.isBlank()) {
            throw new IllegalArgumentException("Private key PEM content must not be null or blank");
        }

        String sanitized = pemContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        try {
            byte[] encodedKey = Base64.getDecoder().decode(sanitized);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
            return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm is not supported by current JCA provider", e);
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("Invalid RSA Private Key specification (ensure PKCS#8 format)", e);
        }
    }

    /**
     * Reads and parses an RSA Public Key encoded in X.509 SubjectPublicKeyInfo format.
     *
     * @param pemContent raw PEM string containing BEGIN PUBLIC KEY
     * @return RSAPublicKey instance instantiated via JCA KeyFactory
     */
    public static RSAPublicKey parsePublicKeyFromPem(String pemContent) {
        if (pemContent == null || pemContent.isBlank()) {
            throw new IllegalArgumentException("Public key PEM content must not be null or blank");
        }

        String sanitized = pemContent
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("-----BEGIN RSA PUBLIC KEY-----", "")
                .replace("-----END RSA PUBLIC KEY-----", "")
                .replaceAll("\\s+", "");

        try {
            byte[] encodedKey = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
            return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm is not supported by current JCA provider", e);
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("Invalid RSA Public Key specification (ensure X.509 format)", e);
        }
    }

    /**
     * Loads a key file from classpath, file URL, or relative path.
     *
     * @param location Spring resource location (e.g., "classpath:keys/private_key.pem")
     * @return content as UTF-8 string
     */
    public static String readResourceContent(String location) {
        try {
            Resource resource = resourceLoader.getResource(location);
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read key resource from location: " + location, e);
        }
    }

    /**
     * Loads and constructs an RSAPrivateKey from a Spring resource location.
     */
    public static RSAPrivateKey loadPrivateKey(String location) {
        log.info("Loading RSA Private Key from: {}", location);
        String content = readResourceContent(location);
        return parsePrivateKeyFromPem(content);
    }

    /**
     * Loads and constructs an RSAPublicKey from a Spring resource location.
     */
    public static RSAPublicKey loadPublicKey(String location) {
        log.info("Loading RSA Public Key from: {}", location);
        String content = readResourceContent(location);
        return parsePublicKeyFromPem(content);
    }

    /**
     * Formats an RSAPublicKey into standard PEM format with 64-character line breaks.
     */
    public static String toPem(RSAPublicKey publicKey) {
        String base64 = Base64.getEncoder().encodeToString(publicKey.getEncoded());
        return wrapInPem(base64, "PUBLIC KEY");
    }

    /**
     * Formats an RSAPrivateKey into PKCS#8 PEM format.
     */
    public static String toPem(RSAPrivateKey privateKey) {
        String base64 = Base64.getEncoder().encodeToString(privateKey.getEncoded());
        return wrapInPem(base64, "PRIVATE KEY");
    }

    private static String wrapInPem(String base64, String type) {
        StringBuilder sb = new StringBuilder();
        sb.append("-----BEGIN ").append(type).append("-----\n");
        int index = 0;
        while (index < base64.length()) {
            sb.append(base64, index, Math.min(index + 64, base64.length())).append("\n");
            index += 64;
        }
        sb.append("-----END ").append(type).append("-----\n");
        return sb.toString();
    }

    /**
     * Converts an RSAPublicKey into an RFC 7517 JSON Web Key (JWK) parameter map.
     */
    public static Map<String, Object> toJwkMap(RSAPublicKey publicKey, String keyId) {
        Map<String, Object> jwk = new HashMap<>();
        jwk.put("kty", "RSA");
        jwk.put("use", "sig");
        jwk.put("alg", "RS256");
        jwk.put("kid", keyId);
        jwk.put("n", encodeBigIntegerBase64Url(publicKey.getModulus()));
        jwk.put("e", encodeBigIntegerBase64Url(publicKey.getPublicExponent()));
        return jwk;
    }

    /**
     * Encodes a BigInteger into unsigned Base64URL string (stripping two's complement leading zeroes).
     */
    public static String encodeBigIntegerBase64Url(BigInteger value) {
        byte[] bytes = value.toByteArray();
        // Remove leading zero byte added by BigInteger.toByteArray() for positive sign representation
        if (bytes.length > 0 && bytes[0] == 0) {
            byte[] trimmed = new byte[bytes.length - 1];
            System.arraycopy(bytes, 1, trimmed, 0, trimmed.length);
            bytes = trimmed;
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
