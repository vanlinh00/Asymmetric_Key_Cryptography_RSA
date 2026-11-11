/**
 * Browser WebCrypto utilities for live RSA asymmetric cryptography experiments,
 * RS256 token signing/verification, and RSA-OAEP encryption/decryption.
 */

export interface GeneratedKeyData {
  publicKeyPem: string;
  privateKeyPem: string;
  modulusLength: number;
  jwk: JsonWebKey;
  keyId: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function formatPem(base64: string, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
  const lines: string[] = [`-----BEGIN ${type}-----`];
  let i = 0;
  while (i < base64.length) {
    lines.push(base64.substring(i, i + 64));
    i += 64;
  }
  lines.push(`-----END ${type}-----`);
  return lines.join('\n');
}

export function base64UrlEncode(str: string): string {
  return window.btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return window.atob(base64);
}

/**
 * Generates an RSA-OAEP key pair for encryption and decryption.
 */
export async function generateRsaKeyPair(modulusLength: 2048 | 4096 = 2048): Promise<{
  publicKeyPem: string;
  privateKeyPem: string;
  keyPair: CryptoKeyPair;
  jwk: JsonWebKey;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const spki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const jwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

  const publicKeyPem = formatPem(arrayBufferToBase64(spki), 'PUBLIC KEY');
  const privateKeyPem = formatPem(arrayBufferToBase64(pkcs8), 'PRIVATE KEY');

  return { publicKeyPem, privateKeyPem, keyPair, jwk };
}

/**
 * Encrypts plaintext using RSA-OAEP with SHA-256.
 */
export async function encryptRsaOaep(plaintext: string, publicKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data
  );
  return arrayBufferToBase64(ciphertextBuffer);
}

/**
 * Decrypts Base64 ciphertext using RSA-OAEP with SHA-256.
 */
export async function decryptRsaOaep(base64Ciphertext: string, privateKey: CryptoKey): Promise<string> {
  const cipherBuffer = base64ToArrayBuffer(base64Ciphertext.trim());
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    cipherBuffer
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generates an RS256 Key Pair for digital signatures (RSASSA-PKCS1-v1_5 with SHA-256).
 */
export async function generateSigningKeyPair(modulusLength: 2048 = 2048): Promise<{
  signingKeyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
  publicKeyPem: string;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const spki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const publicKeyPem = formatPem(arrayBufferToBase64(spki), 'PUBLIC KEY');

  return {
    signingKeyPair: keyPair,
    publicJwk: {
      ...publicJwk,
      use: 'sig',
      alg: 'RS256',
      kid: 'rsa-auth-key-1',
    } as JsonWebKey & { kid?: string },
    publicKeyPem,
  };
}

/**
 * Signs an RS256 JWT using the private key.
 */
export async function createRs256Jwt(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
  kid = 'rsa-auth-key-1'
): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(message)
  );

  const signatureBase64 = arrayBufferToBase64(signatureBuffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${message}.${signatureBase64}`;
}

/**
 * Verifies an RS256 JWT using ONLY the public key.
 */
export async function verifyRs256Jwt(
  jwt: string,
  publicKey: CryptoKey
): Promise<{
  valid: boolean;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  error?: string;
}> {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { valid: false, header: {}, payload: {}, error: 'Malformed JWT structure (expected 3 dot-separated segments)' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // Convert signature from base64Url to ArrayBuffer
    let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (sigBase64.length % 4) {
      sigBase64 += '=';
    }
    const signatureBuffer = base64ToArrayBuffer(sigBase64);

    const message = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();

    const isValid = await window.crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      publicKey,
      signatureBuffer,
      encoder.encode(message)
    );

    return { valid: isValid, header, payload };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, header: {}, payload: {}, error: msg };
  }
}
