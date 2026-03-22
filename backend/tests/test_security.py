"""Tests for encryption utilities and JWT token logic."""
import pytest
from app.utils.security import encrypt, decrypt


class TestEncryption:
    def test_encrypt_decrypt_roundtrip(self):
        original = '{"api_token": "super-secret-value"}'
        ciphertext = encrypt(original)
        assert ciphertext != original
        assert decrypt(ciphertext) == original

    def test_different_values_produce_different_ciphertext(self):
        a = encrypt("value_a")
        b = encrypt("value_b")
        assert a != b

    def test_decrypt_wrong_value_raises(self):
        from cryptography.fernet import InvalidToken
        with pytest.raises(Exception):
            decrypt("this-is-not-valid-fernet-data")
