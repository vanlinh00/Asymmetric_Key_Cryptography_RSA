package com.security.rsa.auth.exception;

public class CryptoOperationException extends RuntimeException {
    public CryptoOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}
