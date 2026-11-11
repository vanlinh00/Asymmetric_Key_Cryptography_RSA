package com.security.rsa.common;

import com.security.rsa.common.crypto.AsymmetricKeyGenerator;
import com.security.rsa.common.crypto.RsaCryptoService;
import com.security.rsa.common.util.PemKeyUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PemAndCryptoTests {

    private final RsaCryptoService cryptoService = new RsaCryptoService();

    @Test
    @DisplayName("Test programmatic 2048-bit RSA key generation and PEM formatting")
    void testKeyGenerationAndPemConversion() {
        KeyPair keyPair = AsymmetricKeyGenerator.generateRsaKeyPair(2048);
        assertNotNull(keyPair);

        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();
        RSAPrivateKey priv = (RSAPrivateKey) keyPair.getPrivate();

        assertEquals(2048, pub.getModulus().bitLength());

        String pubPem = PemKeyUtils.toPem(pub);
        String privPem = PemKeyUtils.toPem(priv);

        assertTrue(pubPem.contains("-----BEGIN PUBLIC KEY-----"));
        assertTrue(privPem.contains("-----BEGIN PRIVATE KEY-----"));

        // Parse back
        RSAPublicKey parsedPub = PemKeyUtils.parsePublicKeyFromPem(pubPem);
        RSAPrivateKey parsedPriv = PemKeyUtils.parsePrivateKeyFromPem(privPem);

        assertEquals(pub.getModulus(), parsedPub.getModulus());
        assertEquals(priv.getModulus(), parsedPriv.getModulus());
    }

    @Test
    @DisplayName("Test RSA-OAEP SHA-256 asymmetric encryption and decryption")
    void testEncryptionDecryptionRoundtrip() {
        KeyPair keyPair = AsymmetricKeyGenerator.generateRsaKeyPair(2048);
        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();
        RSAPrivateKey priv = (RSAPrivateKey) keyPair.getPrivate();

        String secretMessage = "Top Secret Classification: Payload 91823-Alpha";

        String ciphertext = cryptoService.encryptWithPublicKey(secretMessage, pub);
        assertNotNull(ciphertext);
        assertNotEquals(secretMessage, ciphertext);

        String decrypted = cryptoService.decryptWithPrivateKey(ciphertext, priv);
        assertEquals(secretMessage, decrypted);
    }

    @Test
    @DisplayName("Test RFC 7517 JWK Map generation from RSAPublicKey")
    void testJwkMapGeneration() {
        KeyPair keyPair = AsymmetricKeyGenerator.generateRsaKeyPair(2048);
        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();

        Map<String, Object> jwk = PemKeyUtils.toJwkMap(pub, "test-kid-1");
        assertEquals("RSA", jwk.get("kty"));
        assertEquals("sig", jwk.get("use"));
        assertEquals("RS256", jwk.get("alg"));
        assertEquals("test-kid-1", jwk.get("kid"));
        assertNotNull(jwk.get("n"));
        assertNotNull(jwk.get("e"));
    }
}
