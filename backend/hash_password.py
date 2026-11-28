#!/usr/bin/env python3
"""Generate a PBKDF2-SHA-256 password hash compatible with backend/worker.js."""
import base64
import getpass
import hashlib
import secrets

ITERATIONS = 310_000

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

def main() -> None:
    password = getpass.getpass("New admin password (hidden): ")
    confirm = getpass.getpass("Confirm password: ")
    if len(password) < 14 or len(password) > 200:
        raise SystemExit("Use a password between 14 and 200 characters.")
    if password != confirm:
        raise SystemExit("Passwords do not match.")
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS, dklen=32)
    print("Store this hash securely; do not commit it:")
    print(f"pbkdf2_sha256${ITERATIONS}${b64url(salt)}${b64url(derived)}")

if __name__ == "__main__":
    main()
