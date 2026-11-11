package com.security.rsa.common.crypto;

import com.security.rsa.common.util.PemKeyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Utility for generating cryptographically secure RSA key pairs programmatically in Java 17.
 * Adheres to NIST SP 800-57 Part 1 Rev. 5 recommendations (minimum 2048-bit modulus).
 */
public final class AsymmetricKeyGenerator {

    private static final Logger log = LoggerFactory.getLogger(AsymmetricKeyGenerator.class);
    public static final int DEFAULT_KEY_SIZE = 2048;

    private AsymmetricKeyGenerator() {
    }

    /**
     * Generates a new RSA KeyPair with specified key size (e.g. 2048 or 4096 bits)
     * using the strongest available SecureRandom instance.
     *
     * @param keySize bits (typically 2048 or 4096)
     * @return generated KeyPair
     */
    public static KeyPair generateRsaKeyPair(int keySize) {
        log.info("Generating {}-bit RSA Key Pair with SecureRandom...", keySize);
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            SecureRandom secureRandom = SecureRandom.getInstanceStrong();
            generator.initialize(keySize, secureRandom);
            KeyPair keyPair = generator.generateKeyPair();
            log.info("RSA Key Pair generated successfully. Public Exponent: {}",
                    ((RSAPublicKey) keyPair.getPublic()).getPublicExponent());
            return keyPair;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Failed to initialize RSA KeyPairGenerator", e);
        }
    }

    /**
     * Helper record holding generated PEM representations for instant export.
     */
    public record GeneratedPemKeyPair(String publicKeyPem, String privateKeyPem, int keySize) {
    }

    public static GeneratedPemKeyPair generatePemKeyPair(int keySize) {
        KeyPair keyPair = generateRsaKeyPair(keySize);
        String pubPem = PemKeyUtils.toPem((RSAPublicKey) keyPair.getPublic());
        String privPem = PemKeyUtils.toPem((RSAPrivateKey) keyPair.getPrivate());
        return new GeneratedPemKeyPair(pubPem, privPem, keySize);
    }
}
