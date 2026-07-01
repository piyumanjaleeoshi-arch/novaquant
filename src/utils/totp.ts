/**
 * NovaQuant Cryptographic TOTP Engine
 * Standard TOTP (RFC 6238) implementation using Web Crypto API.
 * Runs beautifully on both client and secure scopes without bloated dependencies.
 */

function base32Decode(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/[\s\-=]+/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  return bytes;
}

async function hmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: { name: "SHA-1" } },
    false,
    ["sign"]
  );
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageBytes
  );
  return new Uint8Array(signature);
}

function truncateDigest(digest: Uint8Array): string {
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Generate standard 6-digit TOTP code
 */
export async function generateTOTP(secretBase32: string, timeOffsetSec = 0): Promise<string> {
  try {
    const key = base32Decode(secretBase32);
    const epoch = Math.floor(Date.now() / 1000) + timeOffsetSec;
    const counter = Math.floor(epoch / 30);
    const message = counterToBytes(counter);
    const digest = await hmacSha1(key, message);
    return truncateDigest(digest);
  } catch (error) {
    console.error("[TOTP Error] Generation failed:", error);
    return "000000";
  }
}

/**
 * Verify a user's 6-digit input TOTP code with standard drift window of ±30 seconds
 */
export async function verifyTOTP(token: string, secretBase32: string): Promise<boolean> {
  const cleanedToken = token.trim();
  if (cleanedToken.length !== 6 || isNaN(Number(cleanedToken))) {
    return false;
  }
  
  // Checking window of -30s, 0s, +30s to mitigate clock differences
  for (let step = -1; step <= 1; step++) {
    const computed = await generateTOTP(secretBase32, step * 30);
    if (computed === cleanedToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a crypto-secure random 16-character Base32 secret for Google Authenticator
 */
export function generateTOTPSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  let secret = "";
  for (let i = 0; i < 16; i++) {
    const idx = bytes[i] % alphabet.length;
    secret += alphabet[idx];
  }
  return secret;
}

/**
 * Constructs standard otpauth:// provisioning URL for QR code scan
 */
export function getOTPAuthUrl(email: string, secret: string): string {
  return `otpauth://totp/NovaQuant:${encodeURIComponent(email)}?secret=${secret}&issuer=NovaQuant`;
}
