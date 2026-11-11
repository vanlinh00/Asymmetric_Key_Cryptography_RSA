package com.security.rsa.common.crypto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.MGF1ParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.util.Base64;

/**
 * Enterprise Cryptographic Service using Java Cryptography Architecture (JCA).
 * Implements RSA-OAEP (Optimal Asymmetric Encryption Padding) with SHA-256 digest
 * and MGF1 (Mask Generation Function 1) mask generation.
 *
 * Security Rationale:
 * RSA/ECB/PKCS1Padding is susceptible to Bleichenbacher padding oracle attacks.
 * RSA/ECB/OAEPWithSHA-256AndMGF1Padding is IND-CCA2 secure and recommended by NIST and OWASP.
 */
@Service
public class RsaCryptoService {

    private static final Logger log = LoggerFactory.getLogger(RsaCryptoService.class);

    public static final String TRANSFORMATION_OAEP = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";
    public static final String TRANSFORMATION_PKCS1 = "RSA/ECB/PKCS1Padding";

    private final OAEPParameterSpec oaepParameterSpec;

    public RsaCryptoService() {
        this.oaepParameterSpec = new OAEPParameterSpec(
                "SHA-256",
                "MGF1",
                MGF1ParameterSpec.SHA256,
                PSource.PSpecified.DEFAULT
        );
    }

    /**
     * Encrypts plaintext using the RSA Public Key with OAEP SHA-256 padding.
     *
     * @param plainText UTF-8 plaintext payload
     * @param publicKey RSA Public Key
     * @return Base64-encoded ciphertext
     */
    public String encryptWithPublicKey(String plainText, RSAPublicKey publicKey) {
        if (plainText == null) {
            throw new IllegalArgumentException("Plaintext to encrypt must not be null");
        }
        if (publicKey == null) {
            throw new IllegalArgumentException("RSAPublicKey must not be null");
        }

        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION_OAEP);
            cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParameterSpec);
            byte[] cipherBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(cipherBytes);
        } catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
            throw new IllegalStateException("Crypto provider configuration error: " + TRANSFORMATION_OAEP, e);
        } catch (InvalidKeyException | InvalidAlgorithmParameterException e) {
            throw new IllegalArgumentException("Invalid RSA Public Key or OAEP parameters", e);
        } catch (IllegalBlockSizeException e) {
            // RSA-2048 with OAEP SHA-256 max plaintext size: 256 bytes - 2 * 32 (hash length) - 2 = 190 bytes
            throw new IllegalArgumentException("Payload exceeds maximum allowable block size for RSA-2048 OAEP-SHA256 (max 190 bytes)", e);
        } catch (BadPaddingException e) {
            throw new RuntimeException("Padding error during encryption", e);
        }
    }

    /**
     * Decrypts Base64-encoded ciphertext using the RSA Private Key with OAEP SHA-256 padding.
     *
     * @param base64Ciphertext Base64 ciphertext
     * @param privateKey       RSA Private Key
     * @return Decrypted UTF-8 string
     */
    public String decryptWithPrivateKey(String base64Ciphertext, RSAPrivateKey privateKey) {
        if (base64Ciphertext == null || base64Ciphertext.isBlank()) {
            throw new IllegalArgumentException("Ciphertext to decrypt must not be null or blank");
        }
        if (privateKey == null) {
            throw new IllegalArgumentException("RSAPrivateKey must not be null");
        }

        try {
            byte[] cipherBytes = Base64.getDecoder().decode(base64Ciphertext.trim());
            Cipher cipher = Cipher.getInstance(TRANSFORMATION_OAEP);
            cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParameterSpec);
            byte[] decryptedBytes = cipher.doFinal(cipherBytes);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
            throw new IllegalStateException("Crypto provider configuration error: " + TRANSFORMATION_OAEP, e);
        } catch (InvalidKeyException | InvalidAlgorithmParameterException e) {
            throw new IllegalArgumentException("Invalid RSA Private Key or OAEP parameters", e);
        } catch (BadPaddingException | IllegalBlockSizeException e) {
            log.error("Decryption failed. Potential ciphertext corruption, key mismatch, or padding violation.");
            throw new SecurityException("Cryptographic operation failed: unable to decrypt payload with provided private key", e);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid Base64 ciphertext encoding", e);
        }
    }
}
